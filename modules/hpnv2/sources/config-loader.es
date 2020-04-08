/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable spaced-comment */
import logger from './logger';
import random from '../core/crypto/random';
import pacemaker from '../core/services/pacemaker';

// source: https://stackoverflow.com/a/1353711/783510
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function parseServerTimestamp(ts) {
  if (ts) {
    const date = new Date(ts);
    if (isValidDate(date)) {
      return date;
    }
  }
  throw new Error('Corrupted date:', ts);
}

export default class ConfigLoader {
  constructor(endpoints) {
    this.endpoints = endpoints;

    this.loadConfigSuccessMinInterval = 60 * 60 * 1000; // 1 hour
    this.loadConfigSuccessMaxInterval = 4 * 60 * 60 * 1000; // 4 hours
    this.loadConfigFailureInterval = 10 * 1000; // 10 seconds

    // Triggered immediately when a current timestamp from the server
    // becomes available.
    this.onServerTimestampRefresh = (/*serverTs*/) => {};

    // triggered when the configuration changed
    this.onConfigUpdate = (/*config*/) => {};
  }

  init() {
    this.lastKnownConfig = null;
    this.pendingUpdates = 0;
    this.failedAttemptsInARow = 0;
    this.timeSyncInProgress = false;
    this.failedTimeSyncAttemptsInARow = 0;
  }

  unload() {
    pacemaker.clearTimeout(this.nextConfigUpdate);
    pacemaker.clearTimeout(this.nextClockSyncUpdate);
    this.nextConfigUpdate = null;
  }

  async fetchConfig() {
    pacemaker.clearTimeout(this.nextConfigUpdate);
    this.nextConfigUpdate = null;

    try {
      this.pendingUpdates += 1;
      if (this.pendingUpdates > 1) {
        return;
      }

      // Fetch the config from the server:
      //
      // 'trafficHints' are only relevant for clients that have been
      // running for a while; for the initial load after extension
      // start, there is no need to include it.
      let fields = 'minVersion,groupPubKeys,pubKeys,sourceMap';
      if (this.lastKnownConfig) {
        fields += ',trafficHints';
      }
      const config = await this.endpoints.getConfig(fields);
      if (config !== this.lastKnownConfig) {
        const parsedConfig = JSON.parse(config);
        logger.log('New configuration found');
        try {
          await this.onConfigUpdate(parsedConfig);
          this.lastKnownConfig = config;
        } catch (e2) {
          // we can only reach this point because of a logical error
          logger.error('Internal error: Callbacks must never throw', e2);
          throw e2;
        }
      }
      this.failedAttemptsInARow = 0;
    } catch (e) {
      this.failedAttemptsInARow += 1;
    } finally {
      this.pendingUpdates -= 1;
      if (this.pendingUpdates === 0) {
        this.scheduleNextConfigUpdate();
      }
    }
  }

  synchronizeClocks({ force = false } = {}) {
    if (this.timeSyncInProgress && !force) {
      logger.debug('clock synchronization already in progress');
      return this.timeSyncInProgress;
    }

    this.timeSyncInProgress = (async () => {
      try {
        logger.debug('Fetching timestamp from server to synchronize clocks...');
        const ts = await this.endpoints.getServerTimestamp();
        const serverTs = parseServerTimestamp(ts);
        await this.onServerTimestampRefresh(serverTs);

        logger.debug('Successfully synchronized clocks');
        this.failedTimeSyncAttemptsInARow = 0;
        this.timeSyncInProgress = false;
        pacemaker.clearTimeout(this.nextClockSyncUpdate);
        this.nextClockSyncUpdate = null;
      } catch (e) {
        this.failedTimeSyncAttemptsInARow += 1;
        const cooldown = Math.min(5 * 1000 * this.failedTimeSyncAttemptsInARow, 60 * 60 * 1000);

        logger.warn(`Failed to synchronize clock (reason: ${e}). `
          + `${this.failedTimeSyncAttemptsInARow} failed attempts in a row. `
          + `Try again in ${cooldown / 1000} seconds...`);
        pacemaker.clearTimeout(this.nextClockSyncUpdate);
        this.nextClockSyncUpdate = pacemaker.setTimeout(() => {
          this.synchronizeClocks({ force: true });
        }, cooldown);
      }
    })();
    return this.timeSyncInProgress;
  }

  scheduleNextConfigUpdate() {
    let minCooldown;
    let randomExtraCooldown;
    if (this.failedAttemptsInARow === 0) {
      minCooldown = this.loadConfigSuccessMinInterval;
      randomExtraCooldown = this.loadConfigSuccessMaxInterval - this.loadConfigSuccessMinInterval;
    } else {
      minCooldown = this.failedAttemptsInARow * this.loadConfigFailureInterval;
      randomExtraCooldown = minCooldown;
    }

    // Note: random noise is added, so the collector cannot use
    // time-based attacks to target individual users by serving
    // them different group keys.
    const timeoutInMs = Math.floor(minCooldown + (random() * randomExtraCooldown));

    pacemaker.clearTimeout(this.nextConfigUpdate);
    this.nextConfigUpdate = pacemaker.setTimeout(() => {
      this.fetchConfig().catch(logger.error);
    }, timeoutInMs);
  }

  isHealthy() {
    let healthy = true;
    if (!this.lastKnownConfig) {
      logger.warn('No config loaded yet');
      healthy = false;
    }
    if (this.failedAttemptsInARow > 0) {
      logger.warn(`${this.failedAttemptsInARow} failed config load attempts in a row`);
      healthy = false;
    }
    if (this.failedAttemptsInARow > 0) {
      logger.warn(`${this.failedTimeSyncAttemptsInARow} failed time sync attempts in a row`);
      healthy = false;
    }
    return healthy;
  }
}
