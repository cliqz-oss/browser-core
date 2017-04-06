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
    if (prefs.get("cliqz_core_disabled", false) === false &&
        // we only need the show the location setting for cliqz UI
        prefs.get('dropDownStyle', 'cliqz') == 'cliqz') {
      return {
        visible: true,
        state: utils.getLocationPermState()
      }
    }
  }
}
