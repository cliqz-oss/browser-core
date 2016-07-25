import PrivacyRep from 'privacy-dashboard/main';

/**
* @namespace privacy-dashboard
* @class Background
*/
export default {
  /**
  * @method init
  */
  init() {
    PrivacyRep.onExtensionStart();
  },
  /**
  * @method unload
  */
  unload() {
    PrivacyRep.unload();
  }
};
