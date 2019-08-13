import prefs from '../core/prefs';
import cliqzConfig from '../core/config';
import { isMobile } from '../core/platform';

// Preferences
export const ADB_PREF = 'cliqz-adb';
export const ADB_PREF_STRICT = 'cliqz-adb-strict';
export const ADB_USER_LANG = 'cliqz-adb-lang';

function buildAllowedListsUrl(type) {
  return `${cliqzConfig.settings.ADBLOCKER_BASE_URL}/${type}/allowed-lists.json`;
}

class Config {
  get allowedListsUrl() {
    const platformOverride = cliqzConfig.settings.ADBLOCKER_PLATFORM;
    if (platformOverride) {
      return this.strictMode
        ? buildAllowedListsUrl(`${platformOverride}-ads-trackers`)
        : buildAllowedListsUrl(`${platformOverride}-ads`);
    }

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

  get enabled() {
    const adbPref = prefs.get(ADB_PREF, true); // adblocker is ON by default
    return (adbPref === true || adbPref === 1);
  }

  set enabled(value) {
    prefs.set(ADB_PREF, value);
  }

  get status() {
    return {
      isMobile,
      adbModulePref: prefs.get('modules.adblocker.enabled', true),
      adbPref: prefs.get(ADB_PREF, false),
      adbStrict: prefs.get(ADB_PREF_STRICT, false),
      configUrl: this.allowedListsUrl,
      regionsOverride: prefs.get(ADB_USER_LANG, ''),
    };
  }
}

export default new Config();
