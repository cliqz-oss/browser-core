/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import AdblockerLib from '../platform/lib/adblocker';

import { nextIdle } from '../core/decorators';
import pacemaker from '../core/services/pacemaker';
import { fetchJSON, fetchText, fetchTypedArray } from '../core/http';
import persistentMapFactory from '../core/persistence/map';

import logger from './logger';
import config from './config';
import getEnabledRegions from './regions';

/**
 * Manages the adblocker WebExtensionEngine state. It allows to initialize, update,
 * cache and reload the engine. It takes care of fetching and using the
 * allowed-lists.json file to check if the engine is up-to-date.
 */
export default class EngineManager {
  constructor() {
    this.db = null;
    this.allowedLists = null;
    this.engine = null;
    this.updateInterval = null;

    // Status
    this.lastUpdate = null;
    this.engineSerializedSize = null;
    this.logs = [];
  }

  log(...args) {
    this.logs.push(`${new Date().toLocaleTimeString()}: ${args.join(' ')}`);
    logger.log(...args);
  }

  stopwatch(name) {
    const t0 = Date.now();
    const stop = () => {
      const total = Date.now() - t0;
      this.log(`${name} - ${total} ms`);
    };
    return { stop };
  }

  async init() {
    this.log('engine manager: init');

    const PersistentMap = await persistentMapFactory();
    this.db = new PersistentMap('cliqz-adb');
    await this.db.init();
    await this.load();

    // Whenever browser becomes Idle, trigger an update of the engine. Before
    // that we will use a locally cached version of the engine (from IndexedDB).
    nextIdle().then(() => {
      this.log('start update interval (idle)');
      return this.update();
    }).then(() => {
      this.updateInterval = pacemaker.everyHour(() => this.update());
    });
  }

  unload() {
    this.log('engine manager: unload');
    if (this.db !== null) {
      this.db.unload();
      this.db = null;
    }

    pacemaker.clearTimeout(this.updateInterval);
    this.updateInterval = null;
  }

  isEngineReady() {
    return this.engine !== null;
  }

  async getAllowedLists() {
    if (this.allowedLists === null) {
      await this.updateAllowedLists();
    }

    return this.allowedLists;
  }

  async updateAllowedLists() {
    const allowedListsUrl = config.allowedListsUrl;
    this.log('update allowed lists from CDN', allowedListsUrl);
    this.allowedLists = await fetchJSON(allowedListsUrl);
    return this.allowedLists;
  }

  async getAvailableRegions() {
    const allowedLists = await this.getAllowedLists();
    if (!allowedLists) {
      return [];
    }

    const availableRegions = [];
    for (const list of Object.values(allowedLists.lists)) {
      if (list.lang) {
        availableRegions.push(...list.lang.split(/\s+/g));
      }
    }

    return [...new Set(availableRegions)];
  }

  async getListsStatus() {
    if (this.engine === null) {
      return [];
    }

    return [...this.engine.lists.keys()];
  }

  async status() {
    return {
      availableRegions: await this.getAvailableRegions(),
      lists: await this.getListsStatus(),
      lastUpdate: this.lastUpdate,
      engineSerializedSize: `${(this.engineSerializedSize / 1000000.0).toFixed(1)} MB`,

      // Engine Options
      ...this.engine !== null && this.engine.config,

      // Logs
      logs: this.logs,
    };
  }

  /**
   * Tries to load engine as fast as possible: local cache is tried first, then
   * local bundle, and then CDN (slower). In most cases, calling this function
   * should be pretty fast.
   */
  async load() {
    this.log('engine manager: load');

    if (this.engine === null) {
      this.engine = await this.fetchFromCache();
    }

    if (this.engine === null) {
      this.engine = await this.fetchFromCDN();
    }

    // As a last resort, we initialize an empty instance of the engine. It will
    // then be updated by parsing full-versions of the lists.
    if (this.engine === null) {
      this.engine = new AdblockerLib.WebExtensionBlocker();
    }

    return this.engine;
  }

  async clearCache() {
    await this.db.delete('engine');
  }

  /**
   * Reset local cache then tries to initialize engine again.
   */
  async reset() {
    this.log('engine manager: reset');
    this.engine = null;
    this.allowedLists = null;
    await this.clearCache();
    return this.load();
  }

  /**
   * Update the engine if needed. First tries to get the latest version of
   * allowed-lists.json from CDN then decides how to perform the update in the
   * most efficient way. In particular, this method will make sure to use diffs
   * of outdated lists whenever available and fallback to fetching the full list
   * otherwise.
   */
  async update() {
    this.lastUpdate = new Date();
    this.log('engine manager: update');

    // Update allowed-lists.json
    const allowedLists = await this.updateAllowedLists();

    // Make sure we have an engine loaded already
    if (this.engine === null) {
      this.log('Trying to update when engine is not loaded: loading now');
      await this.load();
    }

    // Collect names of all enabled lists (including region-specific ones)
    const enabledRegions = new Set(getEnabledRegions());
    const enabledLists = new Set();
    Object.entries(allowedLists.lists).forEach(([name, { lang }]) => {
      // If this is a region list, check if it should be enabled.
      // When specified, the format of the `lang` attribute is a
      // space-separated list of alpha2 country codes. For example "de"
      // or "cs sk".
      if (lang !== undefined && !lang.split(/\s+/g).some(l => enabledRegions.has(l))) {
        return;
      }

      enabledLists.add(name);
    });
    this.log('enabled lists', enabledLists);

    let timer = this.stopwatch('update engine (fetch + parse)', 'adblocker');

    // Check if some lists need to be removed from the engine: either because
    // there are lists removed from allowed-lists.json or because some region
    // lists need to be disabled. In this case, we just reset the engine for
    // simplicity. Doing so also allows us to save memory because we do not have
    // to keep track of which filters belong to which list.
    //
    // We also make sure that all lists which need to be updated have an
    // available diff. If not, the operation would be equivalent to first
    // deleting the list then adding the new version. Because of this, we also
    // reset the engine if that happens.
    let foundListsToRemove = false;
    for (const [name, checksum] of this.engine.lists.entries()) {
      // If engine has a list which is not "enabled"
      if (!enabledLists.has(name)) {
        this.log(`list will be removed: ${name}`);
        foundListsToRemove = true;
        break;
      }

      // If engine has an out-dated list which does not have a diff available
      if (
        allowedLists.lists[name].checksum !== checksum
        && allowedLists.lists[name].diffs[checksum] === undefined
      ) {
        this.log(`list has no available diff: ${name}`);
        foundListsToRemove = true;
        break;
      }
    }

    if (foundListsToRemove === true) {
      this.log('found lists to remove, resetting engine');
      this.engine = await this.reset();
    }

    // At this point we know that no list needs to be removed anymore. What
    // remains to be done is: *add new lists* and *update existing lists with
    // their respective diffs*.
    const diffs = [];

    /**
     * Helper function used to fetch a full list, parse it, accumulate
     * parsed filters, then update the checksum in engine if previous
     * steps were successful.
     */
    const processListToAdd = async ({ name, checksum, url }) => {
      try {
        // Create new diff and update version of the list in `this.engine`
        diffs.push({
          added: Array.from(AdblockerLib.getLinesWithFilters(
            await fetchText(url),
            this.engine.config,
          )),
        });
        this.engine.lists.set(name, checksum);
      } catch (ex) {
        logger.error(`Could not add list ${name}`, ex);
      }
    };

    /**
     * Helper function used to fetch a list diff, parse it, accumulate
     * parsed filters, then update the checksum in engine if previous
     * steps were successful.
     */
    const fetchListToUpdate = async ({ name, checksum, url }) => {
      try {
        // Create new diff and update version of the list in `this.engine`
        diffs.push(await fetchJSON(url));
        this.engine.lists.set(name, checksum);
      } catch (ex) {
        logger.error(`Could not update list ${name}`, ex);
      }
    };

    // Go over enabled list and start fetching the ones which need to be added
    // or updated. All of this will happen concurrently.
    const promises = [];
    for (const name of enabledLists) {
      const checksum = this.engine.lists.get(name);
      if (checksum === undefined) {
        this.log(`list will be added: ${name}`);
        promises.push(
          processListToAdd({
            name,
            checksum: allowedLists.lists[name].checksum,
            url: allowedLists.lists[name].url,
          }),
        );
      } else if (checksum !== allowedLists.lists[name].checksum) {
        this.log(`list will be updated: ${name}`);
        promises.push(
          fetchListToUpdate({
            name,
            checksum: allowedLists.lists[name].checksum,
            url: allowedLists.lists[name].diffs[checksum],
          }),
        );
      }
    }

    // Wait for all lists to have been fetched and parsed
    await Promise.all(promises);
    timer.stop();

    // Finally, update engine will all filters to be added and removed. At this
    // point it could be that all lists of filters are empty, but that is not an
    // issue as the `engine.update` method will return `true` if anything was
    // updated and `false` otherwise.
    timer = this.stopwatch('update engine (update)', 'adblocker');
    const cumulativeDiff = AdblockerLib.mergeDiffs(diffs);
    let updated = this.engine.updateFromDiff(cumulativeDiff);
    timer.stop();

    if (updated === true) {
      this.log('updated engine with:', {
        added: cumulativeDiff.added.length,
        removed: cumulativeDiff.removed.length,
      });
    } else {
      this.log('no update was required');
    }

    // Last but not least, check if resources.txt should be updated. This can be
    // done independently of filters as the data is stored in a separate object.
    if (this.engine.resources.checksum !== allowedLists.resources.checksum) {
      this.log('updating resources.txt');
      this.engine.updateResources(
        await fetchText(allowedLists.resources.url),
        allowedLists.resources.checksum,
      );
      updated = true;
    }

    // Only if the engine was updated, save it in cache for next time
    if (updated === true) {
      timer = this.stopwatch('persisting updated engine', 'adblocker');
      const serialized = this.engine.serialize();
      this.engineSerializedSize = serialized.byteLength;
      await this.db.set('engine', serialized);
      timer.stop();
    }

    return this.engine;
  }

  /**
   * After first initialization and each update the engine is persisted locally
   * in cache. This function tries to re-initialize the engine from cache.
   */
  async fetchFromCache() {
    this.log('engine manager: load from cache');

    let timer = this.stopwatch('load typed array from cache', 'adblocker');
    const serialized = await this.db.get('engine');
    timer.stop();
    if (serialized) {
      this.engineSerializedSize = serialized.byteLength;
    }

    if (serialized === undefined) {
      this.log('no cached engine');
    } else {
      timer = this.stopwatch('deserialize engine from cache', 'adblocker');
      try {
        this.engine = AdblockerLib.WebExtensionBlocker.deserialize(serialized);
      } catch (ex) {
        // In case there is a mismatch between the version of the code
        // and the serialization format of the engine on disk, we might
        // not be able to load the engine from disk. Then we just start
        // fresh!
        this.log('exception while loading cached engine', ex);
        this.log('reseting local cache and recovering...');
        this.log('this can happen whenever the adblocker is updated! If it happens again, please report an issue.');
        await this.clearCache();
        return null;
      } finally {
        timer.stop();
      }
    }

    return this.engine;
  }

  /**
   * Tries to fetch a fully-initialized engine from CDN. The URL is obtained
   * from `allowedLists`. Only the last few versions of the adblocker library
   * are supported.
   */
  async fetchFromCDN() {
    this.log('engine manager: load from CDN');

    const allowedLists = await this.getAllowedLists();
    const remoteEngine = allowedLists.engines[AdblockerLib.ENGINE_VERSION];

    // Our version is not supported
    if (remoteEngine === undefined) {
      this.log(
        `Current version of the engine is not available from CDN: ${AdblockerLib.ENGINE_VERSION}`,
      );
      await this.clearCache();
      return null;
    }

    let timer = this.stopwatch('fetch engine from CDN', 'adblocker');
    const serialized = await fetchTypedArray(remoteEngine.url);
    timer.stop();

    timer = this.stopwatch('deserialize remote engine', 'adblocker');
    try {
      this.engine = AdblockerLib.WebExtensionBlocker.deserialize(serialized);
    } catch (ex) {
      logger.error('exception while loading remote engine', ex);
      return null;
    } finally {
      timer.stop();
    }

    timer = this.stopwatch('persist remote engine', 'adblocker');
    await this.db.set('engine', serialized);
    timer.stop();
    this.engineSerializedSize = serialized.byteLength;

    return this.engine;
  }
}
