import CliqzUtils from '../core/utils';
import background from '../core/base/background';
import { isPlatformAtLeastInVersion } from '../core/platform';
import CliqzSecureMessage from './main';
import CryptoWorker from './crypto-worker';

/**
* @namespace hpn
* @class Background
*/
export default background({
  /**
  * @method init
  */
  init() {
    const FF48_OR_ABOVE = isPlatformAtLeastInVersion('48.0');

    if (FF48_OR_ABOVE) {
      // We need to use this function, 'load' events do not seem to be firing...
      this.enabled = true;
      this.CliqzSecureMessage = CliqzSecureMessage;
      CliqzSecureMessage.init();
      CliqzSecureMessage.wCrypto = new CryptoWorker();
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

  actions: {
    sha1(s) {
      let promise = new Promise( (resolve, reject) => {
        let wCrypto = new CryptoWorker();

        wCrypto.onmessage = function(e){
          let result = e.data.result;
          wCrypto.terminate();
          resolve(result);
        };

        wCrypto.postMessage({
          "msg": s,
          "type":"hw-sha1"
        });
      });
      return promise;
    },

    sendTelemetry(msg) {
      return CliqzSecureMessage.telemetry(msg);
    },

    sendInstantMessage(rp, payload) {
      CliqzSecureMessage.proxyIP();
      return new Promise((resolve, reject) => {
        const wCrypto = new CryptoWorker();

        wCrypto.onmessage = function(e){
          const result = JSON.parse(e.data.res).result;
          wCrypto.terminate();
          resolve(result);
        };
        wCrypto.postMessage({
          msg: {
            action: 'instant',
            type: 'cliqz',
            ts: '',
            ver: '1.5',
            payload: payload,
            rp: rp,
          },
          uid: '',
          type: 'instant',
          sourcemap: CliqzSecureMessage.sourceMap,
          upk: CliqzSecureMessage.uPK,
          dspk: CliqzSecureMessage.dsPK,
          sspk: CliqzSecureMessage.secureLogger,
          queryproxyip: CliqzSecureMessage.queryProxyIP,
        });
      });
    }
  },
});
