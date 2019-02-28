import AdblockerWrapper from './mobile';
import events from '../core/events';
import inject, { ifModuleEnabled } from '../core/kord/inject';
import prefs from '../core/prefs';
import UrlWhitelist from '../core/url-whitelist';

import Adblocker from '../platform/lib/adblocker';

import AdbStats from './adb-stats';
import logger from './logger';

import Pipeline from '../webrequest-pipeline/pipeline';

import {
  ADB_DISK_CACHE,
  ADB_PREF,
  ADB_PREF_VALUES,
  ADB_USER_LANG,
  DEFAULT_OPTIONS,
  adbABTestEnabled,
} from './config';


export function isSupportedProtocol(url) {
  return (
    url.startsWith('http://')
    || url.startsWith('https://')
    || url.startsWith('ws://')
    || url.startsWith('wss://'));
}

const CliqzADB = {
  adblockInitialized: false,
  adbStats: new AdbStats(),
  adBlocker: null,
  MIN_BROWSER_VERSION: 35,
  timers: [],
  webRequestPipeline: inject.module('webrequest-pipeline'),
  urlWhitelist: new UrlWhitelist('adb-blacklist'),
  humanWeb: null,
  paused: false,
  onBeforeRequestPipeline: null,
  whitelistChecks: [],

  adbEnabled() {
    // 0 = Disabled
    // 1 = Enabled
    return (
      !CliqzADB.paused
      && adbABTestEnabled()
      && prefs.get(ADB_PREF, ADB_PREF_VALUES.Disabled) !== ADB_PREF_VALUES.Disabled
    );
  },

  addWhiteListCheck(fn) {
    CliqzADB.whitelistChecks.push(fn);
  },

  cliqzWhitelisted(url) {
    return CliqzADB.urlWhitelist.isWhitelisted(url);
  },

  isAdbActive(url) {
    return CliqzADB.adbEnabled()
    && CliqzADB.adblockInitialized
    && !CliqzADB.whitelistChecks.some(fn => fn(url));
  },

  logActionHW(url, action, type) {
    const checkProcessing = CliqzADB.humanWeb.action('isProcessingUrl', url);
    checkProcessing.catch(() => {
      logger.log('no humanweb -> black/whitelist will not be logged');
    });
    const existHW = checkProcessing.then((exists) => {
      if (exists) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
    existHW.then(() => {
      const data = {};
      data[action] = type;
      return CliqzADB.humanWeb.action('addDataToUrl', url, 'adblocker_blacklist', data);
    }, () => logger.log('url does not exist in hw'));
  },

  init(humanWeb) {
    CliqzADB.humanWeb = humanWeb;
    // Set `cliqz-adb` default to 'Disabled'
    if (prefs.get(ADB_PREF, null) === null) {
      prefs.set(ADB_PREF, ADB_PREF_VALUES.Disabled);
    }

    const initAdBlocker = () => {
      CliqzADB.adblockInitialized = true;
      CliqzADB.adBlocker = new AdblockerWrapper({
        onDiskCache: prefs.get(ADB_DISK_CACHE, DEFAULT_OPTIONS.onDiskCache),
        useCountryList: prefs.get(ADB_USER_LANG, DEFAULT_OPTIONS.useCountryList),
      });

      CliqzADB.onBeforeRequestPipeline = new Pipeline('adblocker', [
        {
          name: 'checkContext',
          spec: 'blocking',
          fn: CliqzADB.stepCheckContext,
        },
        {
          name: 'checkWhitelist',
          spec: 'break',
          fn: CliqzADB.stepCheckWhitelist,
        },
        {
          name: 'checkBlocklist',
          spec: 'blocking',
          fn: CliqzADB.stepOnBeforeRequest,
        },
      ]);

      CliqzADB.onHeadersReceivedPipeline = new Pipeline('adblocker', [
        {
          name: 'checkWhitelist',
          spec: 'break',
          fn: CliqzADB.stepCheckWhitelist,
        },
        {
          name: 'checkBlocklist',
          spec: 'blocking',
          fn: CliqzADB.stepOnHeadersReceived,
        },
      ]);

      CliqzADB.whitelistChecks.push(CliqzADB.cliqzWhitelisted);

      return CliqzADB.adBlocker.init().then(() => {
        CliqzADB.initPacemaker();
        return Promise.all([
          CliqzADB.webRequestPipeline.action(
            'addPipelineStep',
            'onBeforeRequest',
            {
              name: 'adblocker',
              spec: 'blocking',
              fn: (...args) => CliqzADB.onBeforeRequestPipeline.execute(...args),
              before: ['antitracking.onBeforeRequest'],
            },
          ),
          CliqzADB.webRequestPipeline.action(
            'addPipelineStep',
            'onHeadersReceived',
            {
              name: 'adblocker',
              spec: 'blocking',
              fn: (...args) => CliqzADB.onHeadersReceivedPipeline.execute(...args),
            },
          ),
        ]);
      });
    };

    this.onPrefChangeEvent = events.subscribe('prefchange', (pref) => {
      if (pref === ADB_PREF) {
        if (!CliqzADB.adblockInitialized && CliqzADB.adbEnabled()) {
          initAdBlocker();
        } else if (CliqzADB.adblockInitialized && !CliqzADB.adbEnabled()) {
          // Shallow unload
          CliqzADB.unload(false);
        }
      }
    });

    if (CliqzADB.adbEnabled()) {
      return CliqzADB.urlWhitelist.init()
        .then(() => initAdBlocker());
    }

    return Promise.resolve();
  },

  unload(fullUnload = true) {
    if (CliqzADB.adblockInitialized) {
      CliqzADB.adBlocker.unload();
      CliqzADB.adBlocker = null;
      CliqzADB.adblockInitialized = false;

      CliqzADB.unloadPacemaker();

      ifModuleEnabled(CliqzADB.webRequestPipeline.action('removePipelineStep', 'onBeforeRequest', 'adblocker'));
      ifModuleEnabled(CliqzADB.webRequestPipeline.action('removePipelineStep', 'onHeadersReceived', 'adblocker'));
    }

    // If this is full unload, we also remove the pref listener
    if (fullUnload) {
      if (this.onPrefChangeEvent) {
        this.onPrefChangeEvent.unsubscribe();
      }
    }
  },

  initPacemaker() {
    const t1 = setInterval(() => {
      CliqzADB.adbStats.clearStats();
    }, 10 * 60 * 1000);
    CliqzADB.timers.push(t1);
  },

  unloadPacemaker() {
    CliqzADB.timers.forEach(clearTimeout);
  },

  stepCheckContext(state, response) {
    if (!(CliqzADB.adbEnabled() && CliqzADB.adblockInitialized)) {
      return false;
    }

    // Due to unbreakable pipelines, blocked requests might still come to
    // adblocker, we can simply ignore them
    if (response.cancel === true || response.redirectUrl) {
      return false;
    }

    const url = state.url;

    if (!url || !isSupportedProtocol(url)) {
      return false;
    }

    // This is the Url
    const sourceUrl = state.sourceUrl || '';
    if (!isSupportedProtocol(sourceUrl)) {
      return false;
    }

    if (state.cpt === 6) {
      // Loading document
      CliqzADB.adbStats.addNewPage(sourceUrl, state.tabId);
      return false;
    }

    return true;
  },

  stepCheckWhitelist(state) {
    if (CliqzADB.urlWhitelist.isWhitelisted(state.sourceUrl || '')) {
      return false;
    }
    return true;
  },

  stepOnBeforeRequest(state, response) {
    const result = CliqzADB.adBlocker.match(Adblocker.makeRequest({
      url: state.url,
      hostname: state.urlParts.hostname,
      domain: state.urlParts.generalDomain,

      sourceUrl: state.sourceUrl,
      sourceHostname: state.sourceUrlParts.hostname,
      sourceDomain: state.sourceUrlParts.generalDomain,

      type: state.type,
    }, {
      // Because we already provide information about `hostname` and `domain`
      // from the webrequest context, we do not need to provide parsing
      // utilities (usually we would pass in `tldts`).
      getDomain: () => '',
      getHostname: () => '',
    }));

    if (result.redirect) {
      response.redirectTo(result.redirect);
      return false;
    }

    if (result.match) {
      CliqzADB.adbStats.addBlockedUrl(state.sourceUrl, state.url, state.tabId, state.ghosteryBug);
      response.block();
      return false;
    }

    return true;
  },

  stepOnHeadersReceived(state, response) {
    if (state.type === 'main_frame') {
      const directives = CliqzADB.adBlocker.engine.getCSPDirectives(Adblocker.makeRequest({
        url: state.url,
        hostname: state.urlParts.hostname,
        domain: state.urlParts.generalDomain,

        type: state.type,
      }, {
        // Because we already provide information about `hostname` and `domain`
        // from the webrequest context, we do not need to provide parsing
        // utilities (usually we would pass in `tldts`).
        getDomain: () => '',
        getHostname: () => '',
      }));

      if (directives !== undefined) {
        const cspHeader = 'content-security-policy';
        const existingCSP = state.getResponseHeader(cspHeader);
        response.modifyResponseHeader(
          cspHeader,
          existingCSP === undefined ? directives : `${existingCSP}; ${directives}`,
        );
      }
    }

    return true;
  },
};

export default CliqzADB;
