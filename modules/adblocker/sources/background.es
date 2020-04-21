/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { browser } from '../platform/globals';

import background from '../core/base/background';
import inject from '../core/kord/inject';

import logger from './logger';
import Adblocker from './adblocker';
import getEnabledRegions from './regions';
import config, {
  ADB_PREF,
  ADB_PREF_STRICT,
  ADB_USER_LANG,
  ADB_MODE,
} from './config';
import { isUrl, parse } from '../core/url';
import telemetry from '../core/services/telemetry';
import metrics from './telemetry/metrics';

function isSupportedProtocol(url) {
  return (
    url.startsWith('http://')
    || url.startsWith('https://')
    || url.startsWith('ws://')
    || url.startsWith('wss://')
  );
}

export default background({
  humanWeb: inject.module('human-web'),
  webRequestPipeline: inject.module('webrequest-pipeline'),
  requiresServices: ['domainInfo', 'pacemaker', 'telemetry'],

  // Global instance of the adblocker
  adblocker: null,

  async shallowInit() {
    // Adblocker is already initialized
    if (this.adblocker !== null) {
      return;
    }

    // Adblocker is not enabled
    if (config.enabled === false) {
      return;
    }

    // Create a new instance of the adblocker and initialize it
    this.adblocker = new Adblocker(this.webRequestPipeline);
    this.adblocker.init().then(() => {
      // Make sure that adblocker should still be enabled and that it was not
      // initialized concurrently. Because `init` is async and could take some
      // time to resolve; it is possible that the adblocker was disabled in the
      // meanwhile (e.g.: via a prefchange event).
      if (config.enabled === false && this.adblocker !== null) {
        this.adblocker.unload();
      }
    });
  },

  async init() {
    telemetry.register(metrics);
    await this.shallowInit();
  },

  shallowUnload() {
    if (this.adblocker !== null) {
      this.adblocker.unload();
      this.adblocker = null;
    }
  },

  unload() {
    telemetry.unregister(metrics);
    this.shallowUnload();
  },

  currentWindowStatus({ id, url }) {
    if (config.abtestEnabled === false) {
      return undefined;
    }

    const isCorrectUrl = isUrl(url);
    let disabledForDomain = false;
    let disabledEverywhere = false;

    // Check if adblocker is disabled on this page
    if (isCorrectUrl && this.adblocker !== null) {
      const whitelist = this.adblocker.whitelist.getState(url);
      disabledForDomain = whitelist.hostname;
    }

    const report = this.adblocker !== null
      ? this.adblocker.stats.report(id)
      : {
        totalCount: 0,
        advertisersList: {},
        advertisersInfo: {},
      };

    const enabled = this.adblocker !== null;
    disabledEverywhere = !enabled && !disabledForDomain;

    // Check stat of the adblocker
    let state;
    if (!enabled) {
      state = 'off';
    } else if (disabledForDomain) {
      state = 'off';
    } else {
      state = 'active';
    }

    // Check disable state
    let offState;
    if (disabledForDomain) {
      offState = 'off_domain';
    } else if (disabledEverywhere) {
      offState = 'off_all';
    }

    return {
      visible: true,
      enabled: enabled && !disabledForDomain && !disabledEverywhere,
      optimized: config.strictMode,
      disabledForDomain,
      disabledEverywhere,
      totalCount: report.totalCount,
      advertisersList: report.advertisersList,
      advertisersInfo: report.advertisersInfo,
      state,
      off_state: offState,
    };
  },

  isAdblockerReady() {
    // This makes sure that adblocker is enabled and that the engine is ready.
    // Whenever the module is loading of the adblocker is being updated, it can
    // happen that the `engine` is `null` for a short period of time until
    // initialization is complete.
    return this.adblocker !== null && this.adblocker.isReady();
  },

  logActionHW(url, action, type) {
    const checkProcessing = this.humanWeb.action('isProcessingUrl', url);
    checkProcessing.catch(() => {
      logger.log('no humanweb -> black/whitelist will not be logged');
    });
    const existHW = checkProcessing.then((exists) => {
      if (exists) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
    existHW.then(
      () => {
        const data = {};
        data[action] = type;
        return this.humanWeb.action('addDataToUrl', url, 'adblocker_blacklist', data);
      },
      () => logger.log('url does not exist in hw'),
    );
  },

  events: {
    'control-center:adb-optimized': function adbOptimized(status) {
      config.strictMode = status;
    },

    'control-center:adb-activator': function adbActivator(data) {
      if (this.adblocker !== null) {
        logger.log('Clear url from whitelist', data.url);
        this.adblocker.whitelist.clearState(data.url);
      }

      if (data.state === 'active') {
        // Control center switch for the adblocker was turned-on
        logger.log('Turn adblocker ON');
        config.enabled = true;
      } else if (data.state === 'off_all') {
        logger.log('Turn adblocker OFF: all sites');
        config.enabled = false;
      } else if (data.state === 'off_domain') {
        logger.log('Turn adblocker OFF: domain');
        config.enabled = true;
        this.adblocker.whitelist.changeState(data.url, 'hostname', 'add');
        this.logActionHW(data.url, 'hostname', 'add');
      }
    },

    async prefchange(pref) {
      if (pref === ADB_PREF_STRICT || pref === ADB_MODE) {
        logger.log('Adblocker mode changed: reset');
        if (this.adblocker !== null) {
          await this.adblocker.reset();
        }
      } else if (pref === ADB_USER_LANG) {
        if (this.adblocker !== null) {
          logger.log('Regions override pref changed: update');
          await this.adblocker.update();
        }
      } else if (pref === ADB_PREF) {
        if (this.adblocker === null && config.enabled) {
          logger.log('Adblocker pref switched: init');
          await this.shallowInit();
        } else if (this.adblocker !== null && config.enabled === false) {
          logger.log('Adblocker pref switched: unload');
          this.shallowUnload();
        }
      }
    },
  },

  actions: {
    getCosmeticsFilters(payload, sender) {
      if (this.isAdblockerReady() === false) {
        return { active: false };
      }

      const tabUrl = sender.tab.url;
      const url = sender.url;

      if (
        isSupportedProtocol(tabUrl) === false
        || isSupportedProtocol(url) === false
        || this.adblocker.shouldProcessRequest({
          isBackgroundRequest: () => false,
          url,
          urlParts: parse(url),
          tabUrl,
          tabUrlParts: parse(tabUrl),
          frameUrl: tabUrl,
          frameUrlParts: parse(tabUrl),
        }, {}) === false
      ) {
        return { active: false };
      }

      return new Promise((resolve) => {
        this.adblocker.manager.engine.handleRuntimeMessage(
          browser,
          { action: 'getCosmeticsFilters', ...payload },
          sender,
          resolve,
        ).catch(() => { /* it's ok if this fails */ });
      });
    },

    /**
     * Return statistics about a specific tab (used in Ghostery).
     */
    getAdBlockInfoForTab(tabId) {
      if (this.adblocker === null) {
        return {};
      }

      return this.adblocker.stats.report(tabId);
    },

    /**
     * Return trackers statistics about a specific tab (used in insights module).
     */
    getGhosteryStats(tabId) {
      if (this.adblocker === null) {
        return {
          bugs: {},
          others: {},
        };
      }

      return this.adblocker.stats.reportTrackers(tabId);
    },

    isWhitelisted(url) {
      if (this.adblocker === null) {
        return false;
      }

      return this.adblocker.whitelist.isWhitelisted(url);
    },

    addWhiteListCheck(fn) {
      if (this.adblocker !== null) {
        this.adblocker.addWhiteListCheck(fn);
      }
    },

    isEnabled() {
      return this.adblocker !== null;
    },

    async status() {
      return {
        ...config.status,
        regions: getEnabledRegions(),
        enabled: this.adblocker !== null,
        ready: this.isAdblockerReady(),
        ...this.adblocker !== null && (await this.adblocker.manager.status()),
        whitelist: (
          this.adblocker === null
            ? []
            : [...this.adblocker.whitelist.whitelist].map(d => d.slice(2))
        ),
      };
    }
  },
});
