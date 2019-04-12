import prefs from '../core/prefs';
import cliqzConfig from '../core/config';
import { isMobile } from '../core/platform';

// Preferences
export const ADB_PREF = 'cliqz-adb';
export const ADB_PREF_STRICT = 'cliqz-adb-strict';
export const ADB_ABTEST_PREF = 'cliqz-adb-abtest';
export const ADB_USER_LANG = 'cliqz-adb-lang';

function buildAllowedListsUrl(type) {
  return `${cliqzConfig.settings.ADBLOCKER_BASE_URL}/${type}/allowed-lists.json`;
}

class Config {
  get allowedListsUrl() {
    // react-native has a custom set of lists to avoid hitting incompatible code
    if (cliqzConfig.platform === 'react-native') {
      return this.strictMode
        ? buildAllowedListsUrl('mobile-react-native-ads-trackers')
        : buildAllowedListsUrl('mobile-react-native-ads');
    }
    if (isMobile) {
      return this.strictMode
        ? buildAllowedListsUrl('mobile-ads-trackers')
        : buildAllowedListsUrl('mobile-ads');
    }
    return this.strictMode
      ? buildAllowedListsUrl('desktop-ads-trackers')
      : buildAllowedListsUrl('desktop-ads');
  }

  get strictMode() {
    return prefs.get(ADB_PREF_STRICT, false);
  }

  set strictMode(value) {
    prefs.set(ADB_PREF_STRICT, value);
  }

  get regionsOverride() {
    const value = prefs.get(ADB_USER_LANG);

    if (value === undefined) {
      return [];
    }

    return value
      .split(';')
      .map(region => region.trim())
      .filter(region => region.length !== 0);
  }

  get abtestEnabled() {
    return prefs.get(ADB_ABTEST_PREF, false) === true;
  }

  set abtestEnabled(value) {
    prefs.set(ADB_ABTEST_PREF, value);
  }

  get enabled() {
    const adbPref = prefs.get(ADB_PREF, false);
    return this.abtestEnabled && (adbPref === true || adbPref === 1);
  }

  set enabled(value) {
    prefs.set(ADB_PREF, value);
  }
}

export default new Config();
