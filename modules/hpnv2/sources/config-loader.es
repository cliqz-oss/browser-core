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
    this._lastKnownConfigWithoutTs = null;
    this.pendingUpdates = 0;
    this.failedAttemptsInARow = 0;
  }

  unload() {
    pacemaker.clearTimeout(this.nextConfigUpdate);
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

      // fetch the config from the server
      const config = await this.endpoints.getConfig();

      try {
        const serverTs = parseServerTimestamp(config.ts);
        await this.onServerTimestampRefresh(serverTs);

        const configWithoutTs = JSON.stringify(Object.assign({}, config, { ts: '' }));
        const isNewConfig = configWithoutTs !== this._lastKnownConfigWithoutTs;

        if (isNewConfig) {
          logger.log('New configuration found');
          await this.onConfigUpdate(config);
          this.lastKnownConfig = config;
          this._lastKnownConfigWithoutTs = configWithoutTs;
        }
      } catch (e2) {
        // we can only reach this point because of a logical error
        logger.error('Internal error: Callbacks must never throw', e2);
        throw e2;
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

  synchronizeClocks() {
    logger.log('Fetching configuration to synchronize clocks');
    this.fetchConfig();
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
    return this.lastKnownConfig && this.failedAttemptsInARow === 0;
  }
}
