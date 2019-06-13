import background from '../core/base/background';
import inject from '../core/kord/inject';

import geolocation from './services/geolocation';

export default background({
  providesServices: {
    geolocation,
  },

  init() {
  },

  unload() {
  },

  beforeBrowserShutdown() {
  },

  events: {
  },

  actions: {
    updateGeoLocation() {
      return inject.service('geolocation', ['updateGeoLocation']).updateGeoLocation();
    },
  },
});
