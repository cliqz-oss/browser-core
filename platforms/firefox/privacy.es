import { getPref, setPref, clearPref } from './prefs';

/**
 * WebExtension privacy API. See reference documentation here
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/privacy
 *
 * Currently implemented:
 *  - websites.cookieConfig
 *  - websites.firstPartyIsolate
 */

function callbackOrPromise(callback, result) {
  if (callback) {
    callback(result);
    return undefined;
  }
  return Promise.resolve(result);
}

/**
 * A setting which is backed by a firefox pref
 */
class PrefSetting {
  constructor(prefName, prefix) {
    this.prefName = prefName;
    this.prefix = prefix;
  }

  get() {
    return getPref(this.prefName, undefined, this.prefix);
  }

  set(value) {
    setPref(this.prefName, value, this.prefix);
  }

  clear() {
    clearPref(this.prefname, this.prefix);
  }
}

/**
 * A setting which is comprised of multiple other settings with some structure
 */
class CompositeSetting {
  constructor(settings) {
    this.settings = settings;
  }

  get() {
    return Object.keys(this.settings).reduce((settings, key) => {
      Object.assign(settings, { [key]: this.settings[key].get() });
      return settings;
    }, {});
  }

  set(value) {
    Object.keys(this.settings).forEach((key) => {
      this.settings[key].set(value[key]);
    });
  }

  clear() {
    Object.keys(this.settings).forEach((key) => {
      this.settings[key].clear();
    });
  }
}

/**
 * Translates the values for a setting used by an api to values we save in the underlying pref.
 */
class TranslatedSetting {
  constructor(setting, valueMap) {
    this.setting = setting;
    this.valueMap = valueMap;
  }

  get() {
    const rawValue = this.setting.get();
    return Object.keys(this.valueMap).find(k => this.valueMap[k] === rawValue);
  }

  set(value) {
    const rawValue = this.valueMap[value];
    this.setting.set(rawValue);
  }

  clear() {
    this.setting.clear();
  }
}

/**
 * Implementation of https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/types/BrowserSetting
 * Locally saves what settings it has set, so we can specify the 'levelOfControl' return value
 * correctly.
 */
class BrowserSetting {
  constructor(name, setting) {
    this.name = name;
    this.setting = setting;
    this._setByMe = getPref(`privacysetting.${this.name}`);
  }

  get(details, callback) {
    const value = this.setting.get();
    const isValueISet = value !== undefined && JSON.stringify(value) === this._setByMe;
    const levelOfControl = isValueISet ? 'controlled_by_this_extension' : 'controllable_by_this_extension';
    const result = { levelOfControl, value };
    return callbackOrPromise(callback, result);
  }

  set({ value }, callback) {
    this.setting.set(value);
    setPref(`privacysetting.${this.name}`, JSON.stringify(value));
    this._setByMe = JSON.stringify(value);
    return callbackOrPromise(callback, true);
  }

  clear(details, callback) {
    this.setting.clear();
    clearPref(`privacysetting.${this.name}`);
    this._setByMe = undefined;
    return callbackOrPromise(callback, true);
  }
}

export default {
  network: {},
  services: {},
  websites: {
    cookieConfig: new BrowserSetting('cookieConfig', new CompositeSetting({
      behavior: new TranslatedSetting(new PrefSetting('network.cookie.cookieBehavior', ''), {
        allow_all: 0,
        reject_all: 2,
        reject_third_party: 1,
        allow_visited: 3,
      }),
      nonPersistentCookies: new PrefSetting('privacy.clearOnShutdown.cookies', ''),
    })),
    firstPartyIsolate: new BrowserSetting('firstPartyIsolate', new PrefSetting('privacy.firstparty.isolate', '')),
  },
};
