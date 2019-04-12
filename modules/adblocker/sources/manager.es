import AdblockerLib from '../platform/lib/adblocker';

import { nextIdle } from '../core/decorators';
import { setTimeoutIntervalInstant } from '../core/helpers/timeout';
import stopwatch from '../core/helpers/stopwatch';
import { fetchJSON, fetchText, fetchTypedArray } from '../core/http';
import PersistentMap from '../core/persistence/map';
import Language from '../core/language';

import logger from './logger';
import config from './config';

const LANG_FACTOR = 20;

/**
 * Return a list of regions/languages enabled. These values come from
 * `core/language` and are based on locally stored statistics about browsing
 * habits (languages of websites visited). This allows to automatically enable
 * region-specific lists for the adblocker (e.g.: if a user visits German
 * website, then the 'german-filters' lists will be enabled). Alternatively,
 * these values can be overriden using the ADB_USER_LANG pref.
 */
function getEnabledRegions() {
  const langOverride = config.regionsOverride;

  // Check regions specified in prefs, if any.
  if (langOverride.length !== 0) {
    logger.log('Use regions override from prefs', langOverride);
    return langOverride;
  }

  // Check `Language` API to retrieve a list of languages.
  if (Language.state) {
    // The most used language is always loaded. For the rest, only if they reach
    // a proportion of the most used one.
    const userLang = [];
    const langDistribution = Language.state(true);
    logger.log('Got language state', langDistribution);
    // langDistribution: [['de', 0.001], ... ]

    if (langDistribution.length > 0) {
      // add most used language
      userLang.push(langDistribution[0][0]);
      const mostUsedScore = langDistribution[0][1];

      // check the rest
      langDistribution.shift(0);
      for (const [lang, score] of langDistribution) {
        if (score < mostUsedScore * LANG_FACTOR) {
          userLang.push(lang);
        }
      }
    }

    logger.log('Use regions from Language API', userLang);
    return userLang;
  }

  logger.log('Use regions default: en');
  return ['en'];
}

/**
 * Manages the adblocker FiltersEngine state. It allows to initialize, update,
 * cache and reload the engine. It takes care of fetching and using the
 * allowed-lists.json file to check if the engine is up-to-date.
 */
export default class EngineManager {
  constructor() {
    this.db = null;
    this.allowedLists = null;
    this.engine = null;
    this.updateInterval = null;
  }

  async init() {
    logger.log('engine manager: init');
    this.db = new PersistentMap('cliqz-adb');
    await this.db.init();
    await this.load();

    // Whenever browser becomes Idle, trigger an update of the engine. Before
    // that we will use a locally cached version of the engine (from IndexedDB).
    nextIdle().then(() => {
      logger.log('start update interval (idle)');
      this.updateInterval = setTimeoutIntervalInstant(() => this.update(), 60 * 60 * 1000);
    });
  }

  unload() {
    logger.log('engine manager: unload');
    if (this.db !== null) {
      this.db.unload();
      this.db = null;
    }

    if (this.updateInterval !== null) {
      this.updateInterval.stop();
      this.updateInterval = null;
    }
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
    logger.log('update allowed lists from CDN', config.allowedListsUrl);
    this.allowedLists = await fetchJSON(config.allowedListsUrl);
    return this.allowedLists;
  }

  /**
   * Tries to load engine as fast as possible: local cache is tried first, then
   * local bundle, and then CDN (slower). In most cases, calling this function
   * should be pretty fast.
   */
  async load() {
    logger.log('engine manager: load');

    if (this.engine === null) {
      this.engine = await this.fetchFromCache();
    }

    if (this.engine === null) {
      this.engine = await this.fetchFromCDN();
    }

    // As a last resort, we initialize an empty instance of the engine. It will
    // then be updated by parsing full-versions of the lists.
    if (this.engine === null) {
      this.engine = new AdblockerLib.FiltersEngine();
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
    logger.log('engine manager: reset');
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
    logger.log('engine manager: update');

    // Update allowed-lists.json
    const allowedLists = await this.updateAllowedLists();

    // Make sure we have an engine loaded already
    if (this.engine === null) {
      logger.log('Trying to update when engine is not loaded: loading now');
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
    logger.log('enabled lists', enabledLists);

    let timer = stopwatch('update engine (fetch + parse)', 'adblocker');

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
        logger.log(`list will be removed: ${name}`);
        foundListsToRemove = true;
        break;
      }

      // If engine has an out-dated list which does not have a diff available
      if (
        allowedLists.lists[name].checksum !== checksum
        && allowedLists.lists[name].diffs[checksum] === undefined
      ) {
        logger.log(`list has no available diff: ${name}`);
        foundListsToRemove = true;
        break;
      }
    }

    if (foundListsToRemove === true) {
      logger.log('found lists to remove, resetting engine');
      this.engine = await this.reset();
    }

    // At this point we know that no list needs to be removed anymore. What
    // remains to be done is: *add new lists* and *update existing lists with
    // their respective diffs*.
    let newNetworkFilters = [];
    let newCosmeticFilters = [];
    let removedNetworkFilters = [];
    let removedCosmeticFilters = [];
    const engineOptions = this.engine === null ? {} : this.engine.config;

    /**
     * Helper function used to fetch a full list, parse it, accumulate
     * parsed filters, then update the checksum in engine if previous
     * steps were successful.
     */
    const processListToAdd = async ({ name, checksum, url }) => {
      try {
        const { networkFilters, cosmeticFilters } = AdblockerLib.parseFilters(
          await fetchText(url),
          engineOptions,
        );
        newCosmeticFilters = newCosmeticFilters.concat(cosmeticFilters);
        newNetworkFilters = newNetworkFilters.concat(networkFilters);

        // Update checksum in engine
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
        const { added, removed } = await fetchJSON(url);

        if (removed.length !== 0) {
          const { networkFilters, cosmeticFilters } = AdblockerLib.parseFilters(
            removed.join('\n'),
            engineOptions,
          );
          removedCosmeticFilters = removedCosmeticFilters.concat(cosmeticFilters);
          removedNetworkFilters = removedNetworkFilters.concat(networkFilters);
        }

        if (added.length !== 0) {
          const { networkFilters, cosmeticFilters } = AdblockerLib.parseFilters(added.join('\n'));
          newCosmeticFilters = newCosmeticFilters.concat(cosmeticFilters);
          newNetworkFilters = newNetworkFilters.concat(networkFilters);
        }

        // Update checksum in engine
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
        logger.log(`list will be added: ${name}`);
        promises.push(
          processListToAdd({
            name,
            checksum: allowedLists.lists[name].checksum,
            url: allowedLists.lists[name].url,
          }),
        );
      } else if (checksum !== allowedLists.lists[name].checksum) {
        logger.log(`list will be updated: ${name}`);
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
    timer = stopwatch('update engine (update)', 'adblocker');
    let updated = this.engine.update({
      newNetworkFilters,
      newCosmeticFilters,
      removedCosmeticFilters,
      removedNetworkFilters,
    });
    timer.stop();

    if (updated === true) {
      logger.log('updated engine with:', {
        newNetworkFilters: newNetworkFilters.length,
        newCosmeticFilters: newCosmeticFilters.length,
        removedNetworkFilters: removedNetworkFilters.length,
        removedCosmeticFilters: removedCosmeticFilters.length,
      });
    } else {
      logger.log('no update was required');
    }

    // Last but not least, check if resources.txt should be updated. This can be
    // done independently of filters as the data is stored in a separate object.
    if (this.engine.resources.checksum !== allowedLists.resources.checksum) {
      logger.log('updating resources.txt');
      this.engine.updateResources(
        await fetchText(allowedLists.resources.url),
        allowedLists.resources.checksum,
      );
      updated = true;
    }

    // Only if the engine was updated, save it in cache for next time
    if (updated === true) {
      timer = stopwatch('persisting updated engine', 'adblocker');
      await this.db.set('engine', this.engine.serialize());
      timer.stop();
    }

    return this.engine;
  }

  /**
   * After first initialization and each update the engine is persisted locally
   * in cache. This function tries to re-initialize the engine from cache.
   */
  async fetchFromCache() {
    logger.log('engine manager: load from cache');

    let timer = stopwatch('load typed array from cache', 'adblocker');
    const serialized = await this.db.get('engine');
    timer.stop();

    if (serialized === undefined) {
      logger.log('no cached engine');
    } else {
      timer = stopwatch('deserialize engine from cache', 'adblocker');
      try {
        this.engine = AdblockerLib.FiltersEngine.deserialize(serialized);
      } catch (ex) {
        // In case there is a mismatch between the version of the code
        // and the serialization format of the engine on disk, we might
        // not be able to load the engine from disk. Then we just start
        // fresh!
        logger.error('exception while loading engine', ex);
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
    logger.log('engine manager: load from CDN');

    const allowedLists = await this.getAllowedLists();
    const remoteEngine = allowedLists.engines[AdblockerLib.ENGINE_VERSION];

    // Our version is not supported
    if (remoteEngine === undefined) {
      logger.log(
        `Current version of the engine is not available from CDN: ${AdblockerLib.ENGINE_VERSION}`,
      );
      await this.clearCache();
      return null;
    }

    let timer = stopwatch('fetch engine from CDN', 'adblocker');
    const serialized = await fetchTypedArray(remoteEngine.url);
    timer.stop();

    timer = stopwatch('deserialize remote engine', 'adblocker');
    this.engine = AdblockerLib.FiltersEngine.deserialize(serialized);
    timer.stop();

    timer = stopwatch('persist remote engine', 'adblocker');
    await this.db.set('engine', serialized);
    timer.stop();

    return this.engine;
  }
}
