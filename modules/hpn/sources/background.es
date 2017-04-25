import CliqzSecureMessage from 'hpn/main';
import CliqzUtils from 'core/utils';

/**
* @namespace hpn
* @class Background
*/
export default {
  /**
  * @method init
  */
  init() {
    let FF48_OR_ABOVE = false;

    try {
      const appInfo = Components.classes['@mozilla.org/xre/app-info;1']
        .getService(Components.interfaces.nsIXULAppInfo);
      const versionChecker = Components.classes['@mozilla.org/xpcom/version-comparator;1']
        .getService(Components.interfaces.nsIVersionComparator);

      if (versionChecker.compare(appInfo.version, '48.0') >= 0) {
        FF48_OR_ABOVE = true;
      }
    } catch (e) { CliqzUtils.log(e); }

    if (FF48_OR_ABOVE) {
      // We need to use this function, 'load' events do not seem to be firing...
      this.enabled = true;
      this.CliqzSecureMessage = CliqzSecureMessage;
      CliqzSecureMessage.init();
      CliqzSecureMessage.wCrypto = new Worker('crypto-worker.js');
      CliqzSecureMessage.wCrypto.onmessage = function (e) {
        if (e.data.type === 'instant') {
          const callback = CliqzSecureMessage.queriesID[e.data.uid];
          delete CliqzSecureMessage.queriesID[e.data.uid];
          callback && callback({ response: e.data.res });
        }
      };
    }
  },
  /**
  * @method unload
  */
  unload() {
    if (this.enabled) {
      CliqzSecureMessage.wCrypto.terminate();
      CliqzSecureMessage.unload();
    }
  },
};
