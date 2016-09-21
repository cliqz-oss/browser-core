import { utils } from 'core/cliqz';
import CliqzSecureMessage from "hpn/main";

/**
* @namespace hpn
* @class Background
*/
export default {
  /**
  * @method init
  */
  init() {
    var FF41_OR_ABOVE = false;

    try {
      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULAppInfo);
      var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Components.interfaces.nsIVersionComparator);

      if(versionChecker.compare(appInfo.version, "41.0") >= 0){
        FF41_OR_ABOVE = true;
      }
    } catch(e){}

    if(FF41_OR_ABOVE && CliqzUtils.getPref("proxyNetwork", true)){
      // We need to use this function, 'load' events do not seem to be firing...
      this.enabled = true;
      this.CliqzSecureMessage = CliqzSecureMessage;
      CliqzSecureMessage.init();
    }
  },
  /**
  * @method unload
  */
  unload() {
    if(this.enabled){
      CliqzSecureMessage.unload();
    }
  }

};
