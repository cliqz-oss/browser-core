/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Defer from '../../core/helpers/defer';
import getGeo from '../../core/geolocation';
import config from '../../core/config';
import prefs from '../../core/prefs';

// Number of decimal digits to keep in user's location
const LOCATION_ACCURACY = 3;

/** Converts numeric degrees to radians */
function degreesToRad(degree) {
  return (degree * Math.PI) / 180;
}

function roundToDecimal(number, digits) {
  const multiplier = 10 ** digits;
  return Math.round(number * multiplier) / multiplier;
}

function roundLocation(position) {
  return roundToDecimal(position, LOCATION_ACCURACY);
}

export default async function service() {
  let geolocationProvider = getGeo;
  let cancelUpdate = new Defer();
  let USER_LAT = null;
  let USER_LNG = null;
  let hasInitialLocation = false;

  service.unload = () => {};

  return {
    resetGeolocationProvider() {
      geolocationProvider = getGeo;
    },
    setGeolocationProvider(provider) {
      geolocationProvider = provider;
    },
    distance(longitude, latitude) {
      const R = 6371; // Radius of the earth in km
      if (!USER_LNG || !longitude || !USER_LAT || !latitude) {
        return -1;
      }
      const dLat = degreesToRad(USER_LAT - latitude); // Javascript functions in radians
      const dLon = degreesToRad(USER_LNG - longitude);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(degreesToRad(latitude))
          * Math.cos(degreesToRad(USER_LAT))
          * Math.sin(dLon / 2)
          * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c; // Distance in km
      return d;
    },

    setGeolocation({ longitude, latitude }) {
      USER_LAT = latitude;
      USER_LNG = longitude;
    },

    /**
     * Return user location if available, otherwise wait for it.
     */
    waitForGeolocation() {
      if (USER_LAT !== null && USER_LNG !== null) {
        return { latitude: USER_LAT, longitude: USER_LNG };
      }

      return this.updateGeoLocation();
    },

    /**
     * Return user location if available. If none is available then longitude
     * and latitude will have null as a value. This function is always sync.
     */
    getGeolocation() {
      if (!hasInitialLocation) {
        this.updateGeoLocation();
        hasInitialLocation = true;
      }
      return { latitude: USER_LAT, longitude: USER_LNG };
    },

    getGeo() {
      const locationPref = prefs.get('share_location', config.settings.geolocation || 'ask');
      if (!['yes', 'showOnce'].includes(locationPref)) {
        return Promise.reject(new Error("No permission to get user's location"));
      }
      return Promise.race([geolocationProvider(), cancelUpdate.promise])
        .then(position => ({
          latitude: roundLocation(position.latitude),
          longitude: roundLocation(position.longitude),
        }));
    },

    async updateGeoLocation() {
      try {
        const { latitude, longitude } = await this.getGeo();
        USER_LAT = latitude;
        USER_LNG = longitude;
      } catch (ex) {
        USER_LAT = null;
        USER_LNG = null;
      }

      return { latitude: USER_LAT, longitude: USER_LNG };
    },

    setLocationPermission(newPerm) {
      if (newPerm === 'yes' || newPerm === 'no' || newPerm === 'ask') {
        prefs.set('share_location', newPerm);
        this.updateGeoLocation();
      }
    },

    resetGeoLocation() {
      cancelUpdate.reject({
        canceled: true,
      });
      hasInitialLocation = false;
      cancelUpdate = new Defer();
      USER_LAT = null;
      USER_LNG = null;
    },
  };
}
