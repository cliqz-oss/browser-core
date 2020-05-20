import events from '../../core/events';
import Feature from './feature';
import { getLocation } from '../utils';

const GEO_PREFS = [
  'config_location',
  'config_location.override',
  'config_location.city',
  'config_location.city.override'
];

export default class GeoChecker extends Feature {
  constructor() {
    super('geo');
    this.loc = null;
    this.onPrefChange = undefined;
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                            Feature methods

  init() {
    this._updateLocFromPrefs();

    // for now we will listen for a pref change
    this.onPrefChange = events.subscribe('prefchange', (pref) => {
      if (GEO_PREFS.indexOf(pref) !== -1) {
        this._updateLocFromPrefs();
      }
    });
    return true;
  }

  unload() {
    if (this.onPrefChange) {
      this.onPrefChange.unsubscribe();
      this.onPrefChange = undefined;
    }
    return true;
  }

  isAvailable() {
    return this.isLocAvailable();
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                            GEO API

  isLocAvailable() {
    return this._checkLoc(this.loc) && this.loc.country !== '--';
  }

  /**
   * will update the current location of the user, the required information will be
   * {
   *   loc: {
   *     // cannot be null the country
   *     country: 'x',
   *     // can be undefined = unknown
   *     city: 'y',
   *     // can be undefined = unknown
   *     zip: 'z'
   *   }
   * }
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  updateLocation(data) {
    this.loc = data ? data.loc : null;
  }

  /**
   * we will check if the current location information matches the given one
   * @param  {[type]} loc [description]
   * @return {[type]}     [description]
   */
  isSameLocation(loc) {
    if (!this._checkLoc(loc) || !this._checkLoc(this.loc)) {
      return false;
    }

    // check if we match all the data we currently have and need
    if (this.loc.country !== loc.country) {
      return false;
    }
    // now we need to see if we have to check more fields from
    if (loc.city) {
      if (loc.city !== this.loc.city) {
        return false;
      }
      if (loc.zip && (loc.zip !== this.loc.zip)) {
        return false;
      }
    }

    // everything matched
    return true;
  }

  /**
   * will check if the geoCountryCityMap matches
   * @param  {Map} geoCountryCityMap country -> city -> postal
   * @return {boolean} Returns true if matches or false otherwise.
   * It will match if:
   * - Is location available.
   * - The current location we have is at least one of the data provided (i.e. if
   *   we have country => geoCountryCityMap should contain country. If we have country +
   *   city => geoCountryCityMap should contain country + city, etc).
   */
  matches(geoCountryCityMap) {
    if (!this.isLocAvailable() || !geoCountryCityMap.has(this.loc.country)) {
      return false;
    }
    const countryToCityMap = geoCountryCityMap.get(this.loc.country);
    if (countryToCityMap.size === 0) {
      // nothing else to check
      return true;
    }
    if (!countryToCityMap.has(this.loc.city)) {
      return false;
    }
    const postals = countryToCityMap.get(this.loc.city);
    if (postals.size === 0) {
      // nothing else to check
      return true;
    }
    return postals.has(this.loc.zip);
  }

  _checkLoc(c) {
    return !!(c && c.country);
  }

  _updateLocFromPrefs() {
    const locData = {
      loc: getLocation()
    };
    this.updateLocation(locData);
  }
}
