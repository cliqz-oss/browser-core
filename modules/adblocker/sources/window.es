import { utils } from 'core/cliqz';
import CliqzADB,
     { adbABTestEnabled,
       ADB_PREF_VALUES,
       ADB_PREF_OPTIMIZED,
       ADB_PREF } from 'adblocker/adblocker';
import events from '../core/events';

const DISMISSED_ALERTS = 'dismissedAlerts';

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    this.showOnboarding();
  }

  unload() {
  }

  showOnboarding() {
    const isInABTest = utils.getPref('cliqz-adb-onboarding-message', false);
    const dismissedAlerts = JSON.parse(utils.getPref(DISMISSED_ALERTS, '{}'));
    const messageType = 'adb-onboarding';
    const isDismissed = dismissedAlerts[messageType] && dismissedAlerts[messageType].count >= 1;
    if (isInABTest && !isDismissed) {
      events.pub(
        'msg_center:show_message',
        {
          id: messageType,
          template: messageType,
        },
        'MESSAGE_HANDLER_FRESHTAB'
      );
    }
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
    if (isCorrectUrl && CliqzADB.adblockInitialized) {
      disabledForDomain = CliqzADB.adBlocker.isDomainInBlacklist(currentURL);
      disabledForUrl = CliqzADB.adBlocker.isUrlInBlacklist(currentURL);
    }

    const report = CliqzADB.adbStats.report(currentURL);
    const enabled = utils.getPref(ADB_PREF, false) !== ADB_PREF_VALUES.Disabled;
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
