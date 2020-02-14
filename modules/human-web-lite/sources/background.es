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

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  // Global instance
  humanWebLite: null,

  requiresServices: [
    'storage',
  ],

  /**
    @method init
    @param settings
  */
  async init(config, browser, { services: { storage } }) {
    this.humanWebLite = new HumanWebLite({ config, storage });

    logger.debug('Initializing HumanWebLite...');
    await this.humanWebLite.init();
  },

  unload() {
    this.humanWebLite.unload();
    this.humanWebLite = null;
  },

  events: {
    'content:location-change': async function onLocationChange({ url, isPrivate }) {
      if (this.humanWebLite && !isPrivate) {
        try {
          await this.humanWebLite.analyzeUrl(url);
        } catch (e) {
          logger.warn('analyzeUrl failed', e);
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
