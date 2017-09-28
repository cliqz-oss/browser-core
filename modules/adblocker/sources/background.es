import { utils } from '../core/cliqz';
import background from '../core/base/background';
import { getBrowserMajorVersion } from '../platform/browser';
import CliqzADB,
      { ADB_PREF_VALUES,
        ADB_PREF,
        ADB_PREF_OPTIMIZED,
        ADB_USER_LANG,
        ADB_USER_LANG_OVERRIDE,
        adbEnabled } from './adblocker';
import inject from '../core/kord/inject';


function isAdbActive(url) {
  return adbEnabled() &&
         CliqzADB.adblockInitialized &&
         !CliqzADB.adBlocker.isDomainInBlacklist(url) &&
         !CliqzADB.adBlocker.isUrlInBlacklist(url);
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
      utils.setPref(ADB_PREF_OPTIMIZED, !utils.getPref(ADB_PREF_OPTIMIZED, false));
    },

    'control-center:adb-activator': (data) => {
      if (CliqzADB.adblockInitialized) {
        const isUrlInBlacklist = CliqzADB.adBlocker.isUrlInBlacklist(data.url);
        const isDomainInBlacklist = CliqzADB.adBlocker.isDomainInBlacklist(data.url);

        // We first need to togle it off to be able to turn it on for the
        // right thing - site or domain
        if (isUrlInBlacklist) {
          CliqzADB.adBlocker.toggleUrl(data.url);
        }

        if (isDomainInBlacklist) {
          CliqzADB.adBlocker.toggleUrl(data.url, true);
        }
      }

      if (data.status === 'active') {
        utils.setPref(ADB_PREF, ADB_PREF_VALUES.Enabled);
      } else if (data.status === 'off') {
        if (data.option === 'all-sites') {
          utils.setPref(ADB_PREF, ADB_PREF_VALUES.Disabled);
        } else {
          utils.setPref(ADB_PREF, ADB_PREF_VALUES.Enabled);
          CliqzADB.adBlocker.toggleUrl(data.url, data.option === 'domain');
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

      return CliqzADB.adBlocker.engine.getCosmeticsFilters(url, nodes);
    },

    getCosmeticsForDomain(url) {
      if (!isAdbActive(url)) {
        return { active: false };
      }

      return CliqzADB.adBlocker.engine.getDomainFilters(url);
    },

    getAdBlockInfo(url) {
      return CliqzADB.adbStats.report(url);
    },

    getAdBlockInfoForTab(tabId) {
      return CliqzADB.adbStats.reportTab(tabId);
    },

    isDomainInBlacklist(domain) {
      if (CliqzADB.adBlocker) {
        return CliqzADB.adBlocker.isDomainInBlacklist(domain);
      }
      return false;
    },

    toggleUrl(url, domain) {
      if (CliqzADB.adBlocker) {
        CliqzADB.adBlocker.toggleUrl(url, domain);
      }
    }
  },
});
