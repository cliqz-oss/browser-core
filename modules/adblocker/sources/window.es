import { utils } from 'core/cliqz';
import CliqzADB,
     { adbABTestEnabled,
       ADB_PREF_VALUES,
       ADB_PREF_OPTIMIZED,
       ADB_PREF } from 'adblocker/adblocker';

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
  }

  unload() {
  }

  status() {
    if (!adbABTestEnabled()) {
      return undefined;
    }

    const currentURL = this.window.gBrowser.currentURI.spec;

    const isCorrectUrl = utils.isUrl(currentURL);
    let disabledForUrl = false;
    let disabledForDomain = false;
    let disabledEverywhere = false;

    // Check if adblocker is disabled on this page
    if (isCorrectUrl) {
      disabledForDomain = CliqzADB.adBlocker.isDomainInBlacklist(currentURL);
      disabledForUrl = CliqzADB.adBlocker.isUrlInBlacklist(currentURL);
    }

    const report = CliqzADB.adbStats.report(currentURL);
    const enabled = utils.getPref(ADB_PREF, false) !== ADB_PREF_VALUES.Disabled;

    if (isCorrectUrl) {
      disabledForDomain = CliqzADB.adBlocker.isDomainInBlacklist(currentURL);
      disabledForUrl = CliqzADB.adBlocker.isUrlInBlacklist(currentURL);
    }
    disabledEverywhere = !enabled && !disabledForUrl && !disabledForDomain;

    // Check stat of the adblocker
    let state;
    if (!enabled) {
      state = 'off';
    } else if (disabledForUrl || disabledForDomain) {
      state = 'off';
    } else {
      state = 'active';
    }

    // Check disable state
    let offState;
    if (disabledForUrl) {
      offState = 'off_website';
    } else if (disabledForDomain) {
      offState = 'off_domain';
    } else if (disabledEverywhere) {
      offState = 'off_all';
    } else {
      offState = 'off_website';
    }

    return {
      visible: true,
      enabled: enabled && !disabledForDomain && !disabledForUrl,
      optimized: utils.getPref(ADB_PREF_OPTIMIZED, false) === true,
      disabledForUrl,
      disabledForDomain,
      disabledEverywhere,
      totalCount: report.totalCount,
      advertisersList: report.advertisersList,
      state,
      off_state: offState,
    };
  }
}
