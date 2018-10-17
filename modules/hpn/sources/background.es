import background from '../core/base/background';
import CliqzSecureMessage from './main';
import CryptoWorker from './crypto-worker';
import inject from '../core/kord/inject';

/**
* @namespace hpn
* @class Background
*/
export default background({
  core: inject.module('core'),
  hpnv2: inject.module('hpnv2'),

  /**
  * @method init
  */
  init() {
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
    // Make sure hpnv2 is enabled if hpn is (to solve issues with module pref being set to false)
    if (this.hpnv2.isPresent() && !this.hpnv2.isEnabled()) {
      this.core.action('enableModule', 'hpnv2');
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
      const queryProxyUrl = CliqzSecureMessage.proxyIP();
      if (!queryProxyUrl) {
        throw new Error('Cannot send message (list of proxies is empty)');
      }

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
        const message = {
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
          queryProxyUrl,
        };

        wCrypto.postMessage(message);
        CliqzSecureMessage.callListeners(message);
      });
    },

    sendPostMessage(rp, payload, action, data, callback) {
      const queryProxyUrl = CliqzSecureMessage.proxyIP();
      if (!queryProxyUrl) {
        throw new Error('Cannot send message (list of proxies is empty)');
      }

      const uid = Math.floor(Math.random() * 10000000);
      CliqzSecureMessage.queriesID[uid] = callback;

      const message = {
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
        queryProxyUrl,
      };

      CliqzSecureMessage.wCrypto.postMessage(message);
      CliqzSecureMessage.callListeners(message);
    }
  },
});
