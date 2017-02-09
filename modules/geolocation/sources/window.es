import { utils } from "core/cliqz";

export default class {
  constructor(settings) {

  }

  init() {
    utils.callAction("geolocation", "updateGeoLocation", []);
  }

  unload() {

  }

  status() {
    if (utils.getPref("cliqz_core_disabled", false) === false &&
        // we only need the show the location setting for cliqz UI
        utils.getPref('dropDownStyle', 'cliqz') == 'cliqz') {
      return {
        visible: true,
        state: utils.getLocationPermState()
      }
    }
  }
}
