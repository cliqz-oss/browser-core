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
import FilterEngine from './filters-engine';


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
          CliqzADB.adBlocker.engine = new FilterEngine();
          CliqzADB.adBlocker.listsManager.initLists();
          CliqzADB.adBlocker.listsManager.load();
        }
      }
    },
  },

  actions: {
    // handles messages coming from process script
    nodes(url, nodes) {
      if (!isAdbActive(url)) {
        return {
          rules: [],
          active: false,
        };
      }
      const candidates = CliqzADB.adBlocker.engine.getCosmeticsFilters(url, nodes);
      return {
        rules: candidates.map(rule => rule.selector),
        active: true,
      };
    },

    url(url) {
      if (!isAdbActive(url)) {
        return {
          scripts: [],
          sytles: [],
          type: 'domain-rules',
          active: false,
        };
      }

      const candidates = CliqzADB.adBlocker.engine.getDomainFilters(url);
      return {
        styles: candidates
          .filter(rule => !rule.scriptInject && !rule.scriptBlock)
          .map(rule => rule.selector),
        scripts: candidates.filter(rule => rule.scriptInject).map(rule => rule.selector),
        scriptBlock: candidates.filter(rule => rule.scriptBlock).map(rule => rule.selector),
        type: 'domain-rules',
        active: true,
      };
    },
  },
});
