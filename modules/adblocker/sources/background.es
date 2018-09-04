import { getBrowserMajorVersion } from '../platform/browser';

import background from '../core/base/background';
import inject from '../core/kord/inject';
import prefs from '../core/prefs';

import { extractHostname } from '../core/tlds';

import CliqzADB, {
  ADB_PREF_VALUES,
  ADB_PREF,
  ADB_PREF_OPTIMIZED,
  ADB_USER_LANG,
  isSupportedProtocol,
} from './adblocker';


export default background({
  humanWeb: inject.module('human-web'),
  core: inject.module('core'),

  requiresServices: ['domainInfo'],

  enabled() { return true; },

  init() {
    if (getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
      return Promise.resolve();
    }
    this.adb = CliqzADB;
    return CliqzADB.init(this.humanWeb);
  },

  unload() {
    if (getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
      return;
    }
    CliqzADB.unload();
  },

  events: {
    'content:location-change': function onLocationChange({ windowId, url }) {
      if (!CliqzADB.isAdbActive(url)) {
        return;
      }

      if (isSupportedProtocol(url)) {
        const response = CliqzADB.adBlocker.engine.getDomainFilters(
          extractHostname(url),
        );
        this.core.action('broadcastActionToWindow', windowId, 'adblocker', 'update', response);
      }
    },

    'control-center:adb-optimized': () => {
      prefs.set(ADB_PREF_OPTIMIZED, !prefs.get(ADB_PREF_OPTIMIZED, false));
    },

    'control-center:adb-activator': (data) => {
      if (CliqzADB.adblockInitialized) {
        CliqzADB.urlWhitelist.clearState(data.url);
      }

      if (data.status === 'active') {
        prefs.set(ADB_PREF, ADB_PREF_VALUES.Enabled);
      } else if (data.status === 'off') {
        if (data.option === 'all-sites') {
          prefs.set(ADB_PREF, ADB_PREF_VALUES.Disabled);
        } else {
          prefs.set(ADB_PREF, ADB_PREF_VALUES.Enabled);
          let type = data.option;
          if (data.option === 'domain') {
            type = 'hostname';
          }
          if (data.option === 'page') {
            type = 'url';
          }
          CliqzADB.urlWhitelist.changeState(data.url, type, 'add');
          CliqzADB.logActionHW(data.url, type, 'add');
        }
      }
    },

    prefchange: (pref) => {
      if (pref === ADB_USER_LANG) {
        if (CliqzADB.adblockInitialized) {
          CliqzADB.adBlocker.reset();
        }
      }
    },
  },

  actions: {
    // handles messages coming from process script
    getCosmeticsForNodes(nodes, sender) {
      const url = sender.tab.url;
      if (!CliqzADB.isAdbActive(url)) {
        return { active: false };
      }

      return CliqzADB.adBlocker.engine.getCosmeticsFilters(
        extractHostname(url),
        nodes
      );
    },

    getCosmeticsForDomain(sender) {
      const url = sender.url;
      const tabUrl = sender.tab.url;
      if (!CliqzADB.isAdbActive(tabUrl)) {
        return { active: false };
      }

      return CliqzADB.adBlocker.engine.getDomainFilters(
        extractHostname(url),
      );
    },

    getAdBlockInfo(tabId) {
      return CliqzADB.adbStats.report(tabId);
    },

    getAdBlockInfoForTab(tabId) {
      return CliqzADB.adbStats.report(tabId);
    },

    getGhosteryStats(tabId) {
      return CliqzADB.adbStats.reportTrackers(tabId);
    },

    isWhitelisted(url) {
      return CliqzADB.urlWhitelist.isWhitelisted(url);
    },

    changeWhitelistState(url, type, action) {
      return CliqzADB.urlWhitelist.changeState(url, type, action);
    },

    getWhitelistState(url) {
      return CliqzADB.urlWhitelist.getState(url);
    },

    // legacy api for mobile
    isDomainInBlacklist(domain) {
      return this.actions.isWhitelisted(domain);
    },

    toggleUrl(url, domain) {
      if (domain) {
        this.actions.changeWhitelistState(url, 'hostname', 'toggle');
      } else {
        this.actions.changeWhitelistState(url, 'url', 'toggle');
      }
    },

    pause() {
      this.adb.paused = true;
    },

    resume() {
      this.adb.paused = false;
    },

    addPipelineStep(opts) {
      if (!this.adb.pipeline) {
        return Promise.reject(`Could not add pipeline step: ${opts.name}`);
      }

      return this.adb.pipeline.addPipelineStep(opts);
    },
    removePipelineStep(name) {
      if (this.adb && this.adb.pipeline) {
        this.adb.pipeline.removePipelineStep(name);
      }
    },
    addWhiteListCheck(fn) {
      CliqzADB.addWhiteListCheck(fn);
    }
  },
});
