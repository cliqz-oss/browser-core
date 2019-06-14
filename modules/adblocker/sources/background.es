import tabs from '../platform/tabs';
import { chrome } from '../platform/globals';

import background from '../core/base/background';
import inject from '../core/kord/inject';
import stopwatch from '../core/helpers/stopwatch';
import { parse } from '../core/tlds';

import logger from './logger';
import Adblocker from './adblocker';
import getEnabledRegions from './regions';
import config, {
  ADB_ABTEST_PREF,
  ADB_PREF,
  ADB_PREF_STRICT,
  ADB_USER_LANG,
} from './config';

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
  requiresServices: ['domainInfo', 'pacemaker'],

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
    await this.shallowInit();
  },

  shallowUnload() {
    if (this.adblocker !== null) {
      this.adblocker.unload();
      this.adblocker = null;
    }
  },

  unload() {
    this.shallowUnload();
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

      if (data.status === 'active') {
        // Control center switch for the adblocker was turned-on
        logger.log('Turn adblocker ON');
        config.enabled = true;
      } else if (data.status === 'off') {
        // Control center switch for the adblocker was turned-off: check which
        // option was specified: domain, page, all sites.
        if (data.option === 'all-sites') {
          logger.log('Turn adblocker OFF: all sites');
          config.enabled = false;
        } else {
          logger.log(`Turn adblocker OFF: current ${data.option}`);
          config.enabled = true;
          let type = data.option;
          if (data.option === 'domain') {
            type = 'hostname';
          }
          if (data.option === 'page') {
            type = 'url';
          }
          this.adblocker.whitelist.changeState(data.url, type, 'add');
          this.logActionHW(data.url, type, 'add');
        }
      }
    },

    async prefchange(pref) {
      if (pref === ADB_PREF_STRICT) {
        logger.log('Strict mode pref changed: reset');
        if (this.adblocker !== null) {
          await this.adblocker.reset();
        }
      } else if (pref === ADB_USER_LANG) {
        if (this.adblocker !== null) {
          logger.log('Regions override pref changed: update');
          await this.adblocker.update();
        }
      } else if (pref === ADB_PREF || pref === ADB_ABTEST_PREF) {
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
    getCosmeticsFilters(sender) {
      if (this.isAdblockerReady() === false) {
        return { active: false };
      }

      const tabUrl = sender.tab.url;
      const url = sender.url;

      if (!isSupportedProtocol(tabUrl) || !isSupportedProtocol(url)
        || !this.adblocker.isAdblockerEnabledForUrl(tabUrl)) {
        return { active: false };
      }

      let timer = stopwatch('getCosmeticsFilters', 'adblocker');
      const { hostname, domain } = parse(url);
      const { active, styles, scripts } = this.adblocker.manager.engine.getCosmeticsFilters({
        url,
        hostname: hostname || '',
        domain: domain || '',
      });
      timer.stop();

      // This can happen if cosmetic filters are disabled in the adblocker
      if (active === false) {
        return { active: false };
      }

      // If the platform does not support `tabs.insertCSS` then we inject
      // everything through content-script (e.g.: react-native).
      if (!tabs.insertCSS) {
        return { active, scripts, styles };
      }

      // Use tabs API to inject cosmetics
      if (styles.length > 0) {
        timer = stopwatch('injectCSS', 'adblocker');
        const cb = () => {
          timer.stop();
          if (chrome.runtime.lastError) {
            logger.error('Error while injecting CSS', chrome.runtime.lastError.message);
          }
        };

        const promise = tabs.insertCSS(
          sender.tab.id,
          {
            allFrames: false,
            code: styles,
            cssOrigin: 'user',
            frameId: sender.frameId,
            matchAboutBlank: false,
            runAt: 'document_start',
          },
          cb,
        );

        if (promise !== undefined) {
          promise.then(cb).catch(cb);
        }
      }

      // Inject scripts from content script
      return { active, scripts };
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
