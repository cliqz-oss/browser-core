import { getBrowserMajorVersion } from '../platform/browser';

import background from '../core/base/background';
import inject from '../core/kord/inject';
import prefs from '../core/prefs';

import tlds from '../core/tlds';

import CliqzADB,
      { ADB_PREF_VALUES,
        ADB_PREF,
        ADB_PREF_OPTIMIZED,
        ADB_USER_LANG,
        ADB_USER_LANG_OVERRIDE,
        adbEnabled } from './adblocker';


function isAdbActive(url) {
  return adbEnabled() &&
    CliqzADB.adblockInitialized &&
    !CliqzADB.urlWhitelist.isWhitelisted(url);
}


export default background({
  humanWeb: inject.module('human-web'),

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
      if (pref === ADB_USER_LANG || pref === ADB_USER_LANG_OVERRIDE) {
        if (CliqzADB.adblockInitialized) {
          // change in user lang pref, reload the filters
          CliqzADB.adBlocker.resetEngine();
          CliqzADB.adBlocker.resetLists();
          CliqzADB.adBlocker.listsManager.load();
        }
      }
    },
  },

  actions: {
    // handles messages coming from process script
    getCosmeticsForNodes(url, nodes) {
      if (!isAdbActive(url)) {
        return { active: false };
      }

      return CliqzADB.adBlocker.engine.getCosmeticsFilters(
        tlds.extractHostname(url),
        nodes
      );
    },

    getCosmeticsForDomain(url) {
      if (!isAdbActive(url)) {
        return { active: false };
      }

      return CliqzADB.adBlocker.engine.getDomainFilters(
        tlds.extractHostname(url),
      );
    },

    getAdBlockInfo(url) {
      return CliqzADB.adbStats.report(url);
    },

    getAdBlockInfoForTab(tabId) {
      return CliqzADB.adbStats.reportTab(tabId);
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
    }
  },
});
