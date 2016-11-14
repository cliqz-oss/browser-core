import { utils } from 'core/cliqz';
import CliqzADB,
     { adbEnabled,
       adbABTestEnabled,
       ADB_PREF_VALUES,
       ADB_PREF_OPTIMIZED,
       ADB_PREF } from 'adblocker/adblocker';


export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if (adbEnabled()) {
      CliqzADB.initWindow(this.window);
      this.window.adbinit = true;
    }
  }

  unload() {
    if (adbEnabled()) {
      CliqzADB.unloadWindow(this.window);
      this.window.adbinit = false;
    }
  }

  status() {
    if (!adbABTestEnabled()) {
      return;
    }

    const currentURL = this.window.gBrowser.currentURI.spec;
    const adbDisabled = !adbEnabled();

    const isCorrectUrl = utils.isUrl(currentURL);
    let disabledForUrl = false;
    let disabledForDomain = false;
    let disabledEverywhere = false;

    // Check if adblocker is disabled on this page
    if (isCorrectUrl) {
      disabledForDomain = CliqzADB.adBlocker.isDomainInBlacklist(currentURL);
      disabledForUrl = CliqzADB.adBlocker.isUrlInBlacklist(currentURL);
    }

    const state = Object.keys(ADB_PREF_VALUES).map(name => ({
      name: name.toLowerCase(),
      selected: utils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) == ADB_PREF_VALUES[name],
    }));

    const report = CliqzADB.adbStats.report(currentURL);
    const enabled = CliqzUtils.getPref(ADB_PREF, false) !== ADB_PREF_VALUES.Disabled;

    if (isCorrectUrl) {
      disabledForDomain = CliqzADB.adBlocker.isDomainInBlacklist(currentURL);
      disabledForUrl = CliqzADB.adBlocker.isUrlInBlacklist(currentURL);
    }
    disabledEverywhere = !enabled && !disabledForUrl && !disabledForDomain

    return {
      visible: true,
      enabled: enabled && !disabledForDomain && !disabledForUrl,
      optimized: CliqzUtils.getPref(ADB_PREF_OPTIMIZED, false) == true,
      disabledForUrl: disabledForUrl,
      disabledForDomain: disabledForDomain,
      disabledEverywhere: disabledEverywhere,
      totalCount: report.totalCount,
      advertisersList: report.advertisersList,
      state: (!enabled) ? 'off' : (disabledForUrl || disabledForDomain ? 'off' : 'active'),
      off_state: disabledForUrl ? 'off_website' : (disabledForDomain ? 'off_domain' : (disabledEverywhere ? 'off_all' : 'off_website'))
    }
  }
}
