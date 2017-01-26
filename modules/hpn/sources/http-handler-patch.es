import CliqzSecureMessage from 'hpn/main';
import utils from 'core/utils';
import environment from 'platform/environment';

const BW_URL = 'https://antiphishing.cliqz.com/api/bwlist?md5=';
export function overRideCliqzResults() {
  if (utils.getPref('proxyNetwork', true) === false) return;

  if (!environment.proxyHttpHandler) environment.proxyHttpHandler = environment.httpHandler;
  environment.httpHandler = function (method, url, callback, onerror, timeout, data, sync) {
    if (url.startsWith(utils.RESULTS_PROVIDER) &&
        utils.getPref('hpn-query', false)) {
      const query = url.replace((utils.RESULTS_PROVIDER), '');
      const uid = Math.floor(Math.random() * 10000000);
      CliqzSecureMessage.queriesID[uid] = callback;
      CliqzSecureMessage.wCrypto.postMessage({
        msg: { action: 'instant',
              type: 'cliqz',
              ts: '',
              ver: '1.5',
              payload: query,
              rp: utils.RESULTS_PROVIDER,
        },
        uid: uid,
        type: 'instant',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        sspk: CliqzSecureMessage.secureLogger,
        queryproxyip: CliqzSecureMessage.queryProxyIP,
      });
      return null;
    } else if (url.startsWith(utils.RESULTS_PROVIDER_LOG) &&
               utils.getPref('hpn-telemetry', false)) {
      const query = url.replace((utils.RESULTS_PROVIDER_LOG), '');
      const uid = Math.floor(Math.random() * 10000000);
      CliqzSecureMessage.queriesID[uid] = callback;
      CliqzSecureMessage.wCrypto.postMessage({
        msg: { action: 'extension-result-telemetry',
              type: 'cliqz',
              ts: '',
              ver: '1.5',
              payload: query,
        },
        uid: uid,
        type: 'instant',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        sspk: CliqzSecureMessage.secureLogger,
        queryproxyip: CliqzSecureMessage.queryProxyIP,
      });
      return null;
    } else if (url.startsWith(BW_URL) &&
               utils.getPref('hpn-telemetry', false)) {
      const query = url.replace(BW_URL, '');
      const uid = Math.floor(Math.random() * 10000000);
      CliqzSecureMessage.queriesID[uid] = callback;
      CliqzSecureMessage.wCrypto.postMessage({
        msg: { action: 'instant',
              type: 'cliqz',
              ts: '',
              ver: '1.5',
              payload: query,
              rp: BW_URL,
        },
        uid: uid,
        type: 'instant',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        sspk: CliqzSecureMessage.secureLogger,
        queryproxyip: CliqzSecureMessage.queryProxyIP,
      });
      return null;
    } else if (url === utils.SAFE_BROWSING &&
               utils.getPref('hpn-telemetry', false)) {
      const batch = JSON.parse(data);
      if (batch.length > 0) {
        batch.forEach(eachMsg => {
          CliqzSecureMessage.telemetry(eachMsg);
        });
      }
      callback && callback({ 'response': '{"success":true}' });
    } else {
      return environment.proxyHttpHandler.apply(utils, arguments);
    }
    return null;
  };
  if (!environment.proxyPromiseHttpHandler) {
    environment.proxyPromiseHttpHandler = environment.promiseHttpHandler;
  }
  utils.promiseHttpHandler = function (method, url, data, timeout, compressedPost) {
    if (url === utils.SAFE_BROWSING &&
        utils.getPref('hpn-telemetry', false)) {
      return environment.proxyPromiseHttpHandler(method, url, data, timeout, false);
    } else {
      return environment.proxyPromiseHttpHandler.apply(utils, arguments);
    }
  };
}
