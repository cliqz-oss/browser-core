/* eslint import/prefer-default-export: 'off' */

import prefs from '../core/prefs';
import * as http from '../core/http';
import CliqzSecureMessage from './main';
import config from '../core/config';

// HPN will only route based on the build config,
// changes in prefs (`triggersBE`) will make the singals escape hpn
const OFFER_TELEMETRY_PREFIX = config.settings.OFFERS_BE_BASE_URL;

function getNextProxyAndRotate() {
  // Make sure that that CliqzSecureMessage.queryProxyIP exists,
  // otherwise, sending the message will silently fail.
  //
  // The queryProxyIP contains the proxy's verify endpoint
  // (e.g., "http://<proxy-ip>/verify" or "https://<proxy-url>/verify").
  const proxyUrl = CliqzSecureMessage.proxyIP();
  if (!proxyUrl) {
    throw new Error(
      'Failed to send message, as the list of proxies is empty');
  }
  return proxyUrl;
}

let proxyHttpHandler = null;
export function overRideCliqzResults() {
  if (prefs.get('proxyNetwork', true) === false) return;

  if (!proxyHttpHandler) proxyHttpHandler = http.defaultHttpHandler;

  function httpHandler(method, url, callback, onerror, timeout, data, ...rest) {
    if (url.startsWith(config.settings.RESULTS_PROVIDER) &&
        prefs.get('hpn-queryv2', false)) {
      const queryProxyUrl = getNextProxyAndRotate();

      const query = url.replace((config.settings.RESULTS_PROVIDER), '');
      const uid = Math.floor(Math.random() * 10000000);
      CliqzSecureMessage.queriesID[uid] = callback;
      CliqzSecureMessage.wCrypto.postMessage({
        msg: { action: 'instant',
          type: 'cliqz',
          ts: '',
          ver: '1.5',
          payload: query,
          rp: config.settings.RESULTS_PROVIDER,
        },
        uid,
        type: 'instant',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        sspk: CliqzSecureMessage.secureLogger,
        queryProxyUrl,
      });
      return null;
    } else if (url.startsWith(config.settings.RESULTS_PROVIDER_LOG)) {
      const queryProxyUrl = getNextProxyAndRotate();

      const query = url.replace((config.settings.RESULTS_PROVIDER_LOG), '');
      const uid = Math.floor(Math.random() * 10000000);
      CliqzSecureMessage.queriesID[uid] = callback;
      CliqzSecureMessage.wCrypto.postMessage({
        msg: { action: 'extension-result-telemetry',
          type: 'cliqz',
          ts: '',
          ver: '1.5',
          payload: query,
        },
        uid,
        type: 'instant',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        sspk: CliqzSecureMessage.secureLogger,
        queryProxyUrl,
      });
      return null;
    } else if (url === config.settings.SAFE_BROWSING) {
      const batch = JSON.parse(data);
      if (batch.length > 0) {
        batch.forEach(eachMsg => CliqzSecureMessage.telemetry(eachMsg));
      }
      if (callback) {
        callback({ response: '{"success":true}' });
      }
    } else if (url.startsWith(OFFER_TELEMETRY_PREFIX)) {
      const queryProxyUrl = getNextProxyAndRotate();

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
        uid,
        type: 'instant',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        sspk: CliqzSecureMessage.secureLogger,
        queryProxyUrl,
      };
      CliqzSecureMessage.wCrypto.postMessage(message);
      return null;
    } else {
      return proxyHttpHandler(method, url, callback, onerror, timeout, data, ...rest);
    }
    return null;
  }

  http.overrideHttpHandler(httpHandler);
  http.addCompressionExclusion(config.settings.SAFE_BROWSING);
}
