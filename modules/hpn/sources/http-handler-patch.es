import utils from '../core/utils';
import * as http from '../core/http';
import CliqzSecureMessage from './main';

const OFFER_TELEMETRY = 'https://offers-api.cliqz.com/api/v1/savesignal';
const OFFER_TELEMETRY_PREFIX = 'https://offers-api.cliqz.com'

let proxyHttpHandler = null;
export function overRideCliqzResults() {
  if (utils.getPref('proxyNetwork', true) === false) return;

  if (!proxyHttpHandler) proxyHttpHandler = http.defaultHttpHandler;

  function httpHandler(method, url, callback, onerror, timeout, data, sync) {
    if (url.startsWith(utils.RESULTS_PROVIDER) &&
        utils.getPref('hpn-queryv2', false)) {
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
        queryProxyUrl: CliqzSecureMessage.queryProxyIP,
      });
      return null;
    } else if (url.startsWith(utils.RESULTS_PROVIDER_LOG)) {
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
        queryProxyUrl: CliqzSecureMessage.queryProxyIP,
      });
      return null;
    } else if (url === utils.SAFE_BROWSING) {
      const batch = JSON.parse(data);
      if (batch.length > 0) {
        batch.forEach(eachMsg => {
          CliqzSecureMessage.telemetry(eachMsg);
        });
      }
      callback && callback({ 'response': '{"success":true}' });
    } else if (url.startsWith(OFFER_TELEMETRY_PREFIX)) {

      // Make sure that that CliqzSecureMessage.queryProxyIP exists,
      // otherwise, sending the message will silently fail.
      //
      // The queryProxyIP contains the proxy's verify endpoint
      // (e.g., "http://<proxy-ip>/verify").
      const queryProxyUrl = CliqzSecureMessage.proxyIP();
      if (!queryProxyUrl) {
        throw new Error(
          'Failed to send message, as the list of proxies is empty');
      }

      const query = url.replace(OFFER_TELEMETRY_PREFIX, '');
      const uid = Math.floor(Math.random() * 10000000);
      CliqzSecureMessage.queriesID[uid] = callback;

      const message = {
        msg: { action: 'offers-api',
              type: 'cliqz',
              ts: '',
              ver: '1.5',
              payload: query,
              rp: OFFER_TELEMETRY_PREFIX,
              body: data,
        },
        uid: uid,
        type: 'instant',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        sspk: CliqzSecureMessage.secureLogger,
        queryProxyUrl: queryProxyUrl,
      };
      CliqzSecureMessage.wCrypto.postMessage(message);
      return null;
    } else {
      return proxyHttpHandler.apply(undefined, arguments);
    }
    return null;
  };

  http.overrideHttpHandler(httpHandler);
  http.addCompressionExclusion(utils.SAFE_BROWSING);

}
