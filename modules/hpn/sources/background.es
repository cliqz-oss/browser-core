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
      CliqzSecureMessage.wCrypto = new CryptoWorker('httpHandler');
      CliqzSecureMessage.wCrypto.onmessage = (e) => {
        if (e.data.type === 'instant') {
          const callback = CliqzSecureMessage.queriesID[e.data.uid];
          delete CliqzSecureMessage.queriesID[e.data.uid];
          if (callback) {
            callback({ response: e.data.res });
          }
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
      const promise = new Promise((resolve) => {
        const wCrypto = new CryptoWorker();

        wCrypto.onmessage = (e) => {
          const result = e.data.result;
          wCrypto.terminate();
          resolve(result);
        };

        wCrypto.postMessage({
          msg: s,
          type: 'hw-sha1'
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

        wCrypto.onmessage = (e) => {
          try {
            const result = JSON.parse(e.data.res).result;
            wCrypto.terminate();
            resolve(result);
          } catch (ee) {
            wCrypto.terminate();
            reject();
          }
        };
        wCrypto.postMessage({
          msg: {
            action: 'instant',
            type: 'cliqz',
            ts: '',
            ver: '1.5',
            payload,
            rp,
          },
          uid: '',
          type: 'instant',
          sourcemap: CliqzSecureMessage.sourceMap,
          upk: CliqzSecureMessage.uPK,
          dspk: CliqzSecureMessage.dsPK,
          sspk: CliqzSecureMessage.secureLogger,
          queryProxyUrl: CliqzSecureMessage.queryProxyIP,
        });
      });
    },

    sendPostMessage(rp, payload, action, data, callback) {
      const uid = Math.floor(Math.random() * 10000000);
      CliqzSecureMessage.queriesID[uid] = callback;
      CliqzSecureMessage.wCrypto.postMessage({
        msg: {
          action,
          type: 'cliqz',
          ts: '',
          ver: '1.5',
          payload,
          rp,
          body: data,
        },
        uid: '',
        type: 'instant',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        sspk: CliqzSecureMessage.secureLogger,
        queryProxyUrl: CliqzSecureMessage.queryProxyIP,
      });
    }
  },
});
