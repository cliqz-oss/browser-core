import background from '../core/base/background';
import PrivacyRep from './main';

/**
* @namespace privacy-dashboard
* @class Background
*/
export default background({
  /**
  * @method init
  */
  init() {
    PrivacyRep.onExtensionStart();
  },

  get CliqzPrivacyRep() {
    return PrivacyRep;
  },

  /**
  * @method unload
  */
  unload() {
    PrivacyRep.unload();
  }
});
