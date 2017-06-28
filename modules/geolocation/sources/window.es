import inject from '../core/kord/inject';
import utils from '../core/utils';
import prefs from '../core/prefs';

export default class {
  constructor(settings) {
    this.geolocation = inject.module('geolocation');
  }

  init() {
    this.geolocation.action("updateGeoLocation");
  }

  unload() {

  }

  status() {
    return {
      visible: true,
      state: utils.getLocationPermState()
    }
  }
}
