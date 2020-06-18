/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';

import HumanWebLite from './human-web-lite';
import logger from './logger';
import random from '../core/crypto/random';
import inject from '../core/kord/inject';

function parseBool(value, default_) {
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  return default_;
}

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  // Global instance
  humanWebLite: null,

  // Whether the module should operate without guidance from the OS
  autoTrigger: false,
  nextAutoTrigger: null,

  requiresServices: [
    'storage',
  ],
  hpnLite: inject.module('hpn-lite'),

  async init(config, browser, { services }) {
    const storage = services.storage;
    const hpn = this.hpnLite;
    this.humanWebLite = new HumanWebLite({ config, storage, hpn });
    this.autoTrigger = parseBool(config.HUMAN_WEB_LITE_AUTO_TRIGGER, false);

    logger.debug('Initializing HumanWebLite...');
    await this.humanWebLite.init();
  },

  unload() {
    if (this.nextAutoTrigger) {
      clearTimeout(this.nextAutoTrigger);
      this.nextAutoTrigger = null;
    }
    this.humanWebLite.unload();
    this.humanWebLite = null;
  },

  /**
   * By default, the module waits for the browser to signal
   * when it should execute jobs (e.g. doublefetch, message sending).
   *
   * However, when "auto-trigger" mode is configured, it will
   * instead automatically run jobs.
   */
  _scheduleAutoTrigger() {
    if (this.nextAutoTrigger) {
      return;
    }
    const delayInMs = 10000 + 20000 * random();
    logger.debug('Auto-triggering in', delayInMs / 1000, 'seconds');
    this.nextAutoTrigger = setTimeout(async () => {
      this.nextAutoTrigger = null;
      if (this.humanWebLite) {
        logger.debug('Auto-triggering scheduled jobs...');
        try {
          await this.humanWebLite.processPendingJobs();
          logger.debug('Auto-triggering scheduled jobs...done');
        } catch (e) {
          this._scheduleAutoTrigger();
        }
      }
    }, delayInMs);
  },

  events: {
    'content:location-change': async function onLocationChange({ url, isPrivate }) {
      if (this.humanWebLite && !isPrivate) {
        let found;
        try {
          found = await this.humanWebLite.analyzeUrl(url);
        } catch (e) {
          logger.warn('analyzeUrl failed', e);
        }
        if (found && this.autoTrigger) {
          this._scheduleAutoTrigger();
        }
      }
    },
  },

  actions: {
    /**
     * Run this when it is a good time to do some work
     * (expect network calls).
     */
    async processPendingJobs() {
      if (!this.humanWebLite) {
        throw new Error('Module is not properly initialized');
      }
      return this.humanWebLite.processPendingJobs();
    }
  },
});
