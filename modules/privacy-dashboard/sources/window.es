import PrivacyRep from 'privacy-dashboard/main';
import { utils } from 'core/cliqz';
/**
* @namespace privacy-dashboard
* @class Window
*/
export default class {
  /**
  * @method init
  */
  init() {}

  unload() {}

  status() {
    if (utils.getPref("cliqz_core_disabled", false)) return;

    return {
      visible: true
    }
  }
}
