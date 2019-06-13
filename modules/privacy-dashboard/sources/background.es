import background from '../core/base/background';
import PrivacyRep from './main';

/**
* @namespace privacy-dashboard
* @class Background
*/
export default background({
  requiresServices: ['telemetry'],

  /**
  * @method init
  */
  init(settings) {
    PrivacyRep.onExtensionStart(settings);
  },

  /**
  * @method unload
  */
  unload() {
    PrivacyRep.unload();
  },

  actions: {
    register() {
      PrivacyRep.registerStream();
    },
    unregister() {
      PrivacyRep.unregisterStream();
    },
    getData() {
      return PrivacyRep.getCurrentData();
    }
  }
});
