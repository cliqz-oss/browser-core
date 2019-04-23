import {
  getPref,
  setPref,
  hasPref,
  clearPref,
  init,
  getAllCliqzPrefs,
  PLATFORM_TELEMETRY_WHITELIST,
} from '../platform/prefs';

export default {
  /**
   * Get a value from preferences db
   * @param {string}  pref - preference identifier
   * @param {*=}      defautlValue - returned value in case pref is not defined
   * @param {string=} prefix - prefix for pref
   */
  get: getPref,
  /**
   * Set a value in preferences db
   * @param {string}  pref - preference identifier
   * @param {string=} prefix - prefix for pref
   */
  set: setPref,
  /**
   * Check if there is a value in preferences db
   * @param {string}  pref - preference identifier
   * @param {string=} prefix - prefix for pref
   */
  has: hasPref,
  /**
   * Clear value in preferences db
   * @param {string}  pref - preference identifier
   * @param {string=} prefix - prefix for pref
   */
  clear: clearPref,

  /**
   * Set a value of type object in preferences db
   * @param {string}  pref - preference identifier
   */
  getObject(key, ...rest) {
    return JSON.parse(this.get(key, '{}', ...rest));
  },

  /**
   * Set a value in preferences db
   * @param {string}  pref - preference identifier
   * @param {object|function}
   */
  setObject(key, value, ...rest) {
    if (value instanceof Function) {
      const prevValue = this.getObject(key);
      const newValue = value(prevValue);
      this.setObject(key, newValue, ...rest);
    } else if (typeof value === 'object') {
      this.set(key, JSON.stringify(value), ...rest);
    } else {
      throw new TypeError();
    }
  },

  init,
};

const TELEMETRY_WHITELIST = new Set([
  'ABTests', // state of running AB tests
  'abtests_running', // list of AB tests in new AB testing framework
  'adultContentFilter', // adult filter state for search
  'antitracking.enabled', // anti tracking module state
  'backend_country', // search backend selection
  'cliqz-adb', // ad blocking module state
  'cliqz-anti-phishing-enabled', // anti phishing module state
  'config_location', // current contry (only a limited set is allowed from the backend)
  'config_ts', // current day YYYYMMDD format
  'developer', // extension developer
  'distribution', // distribution source
  'full_distribution', // distribution source
  'freshtab.state', // freshtab state
  'freshtabConfig', // configuration for freshtab elements
  'hpn-query', // query (search) though HPN
  'humanWebOptOut', // human web state
  'install_date', // self explanatory :)
  // TODO: Lumen protection state should be independent from environment signal;
  //       to be moved to a dedicated metric and analysis if Lumen is continued
  'lumen.protection.isEnabled', // Lumen: protection state (blocking + anti-phishing)
  'offers_location', // local offers
  'offers2UserEnabled', // offers state
  'offersDevFlag', // offers dev flag
  'serp_test', // AB Test running from 1.27.2, possible values A/B/C
  'session', // user session
  'share_location', // use location for enhanced local results
  'telemetry', // telemetry state
]);

export function getCliqzPrefs() {
  const cliqzPrefs = {};
  const cliqzPrefsKeys = getAllCliqzPrefs()
    .filter(entry => TELEMETRY_WHITELIST.has(entry));

  for (let i = 0; i < cliqzPrefsKeys.length; i += 1) {
    cliqzPrefs[cliqzPrefsKeys[i]] = getPref(cliqzPrefsKeys[i]);
  }

  PLATFORM_TELEMETRY_WHITELIST.forEach((key) => {
    cliqzPrefs[key] = getPref(key, undefined, '');
  });

  return cliqzPrefs;
}
