import inject from '../core/kord/inject';
import utils from '../core/utils';

export default class Win {
  constructor() {
    this.geolocation = inject.module('geolocation');
  }

  init() {
    this.geolocation.action('updateGeoLocation');
  }

  unload() {

  }

  status() {
    return {
      visible: true,
      state: utils.getLocationPermState()
    };
  }
}
