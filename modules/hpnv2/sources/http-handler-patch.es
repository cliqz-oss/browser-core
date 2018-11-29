// Copied from old hpn module
import prefs from '../core/prefs';
import * as http from '../core/http';
import config from '../core/config';
import inject from '../core/kord/inject';
import console from '../core/console';
import utils from '../core/utils';

// HPN will only route based on the build config,
// changes in prefs (`triggersBE`) will make the singals escape hpn
const OFFER_TELEMETRY_PREFIX = config.settings.OFFERS_BE_BASE_URL;

let proxyHttpHandler = null;
export function overRideCliqzResults() {
  const hpnv2 = inject.module('hpnv2');
  if (prefs.get('proxyNetwork', true) === false) return;

  if (!proxyHttpHandler) proxyHttpHandler = http.defaultHttpHandler;

  async function sendMessageOverHpn(message, callback, onerror) {
    try {
      // TODO: Before or after?
      // CliqzSecureMessage.callListeners(message);
      const response = await hpnv2.action('sendLegacy', message);
      if (callback) {
        callback({ response });
      }
    } catch (e) {
      // TODO: this was not called before!
      console.log('sendMessageOverHpn error', e);
      if (onerror) {
        onerror(e);
      }
    }
  }

  function fetchHandler(url, options) {
    if (typeof url !== 'string') {
      return undefined;
    }
    // TODO: check other api.cliqz.com calls
    if (prefs.get('hpn-query', false) || utils.isPrivateMode()) {
      if (url.startsWith(config.settings.RESULTS_PROVIDER)) {
        const { pathname, search } = new URL(url);
        const method = (options.method || 'GET').toUpperCase();
        if (method === 'GET') {
          return hpnv2.action('send', {
            action: 'search',
            method: 'GET',
            payload: search,
            path: pathname,
          });
        }
      }
    }
    return undefined;
  }

  function httpHandler(method, url, callback, onerror, timeout, data, ...rest) {
    if (url.startsWith(config.settings.BW_URL)) {
      const query = url.replace((config.settings.BW_URL), '');
      sendMessageOverHpn({
        action: 'instant',
        type: 'cliqz',
        ts: '',
        ver: '1.5',
        payload: query,
        rp: config.settings.BW_URL,
      }, callback, onerror);

      return null;
    }

    if (prefs.get('hpn-query', false) || utils.isPrivateMode(utils.getWindow())) {
      if (url.startsWith(config.settings.RESULTS_PROVIDER_PING)) {
        sendMessageOverHpn({
          action: 'instant',
          type: 'cliqz',
          ts: '',
          ver: '1.5',
          payload: {},
          rp: config.settings.RESULTS_PROVIDER_PING,
        }, callback, onerror);

        return null;
      }

      if (url.startsWith(config.settings.RESULTS_PROVIDER)) {
        const query = url.replace((config.settings.RESULTS_PROVIDER), '');
        sendMessageOverHpn({
          action: 'instant',
          type: 'cliqz',
          ts: '',
          ver: '1.5',
          payload: query,
          rp: config.settings.RESULTS_PROVIDER,
        }, callback, onerror);

        return null;
      }
    }

    if (url.startsWith(config.settings.RESULTS_PROVIDER_LOG)) {
      const query = url.replace((config.settings.RESULTS_PROVIDER_LOG), '');
      sendMessageOverHpn({
        action: 'extension-result-telemetry',
        type: 'cliqz',
        ts: '',
        ver: '1.5',
        payload: query,
      }, callback, onerror);
      return null;
    }

    if (url === config.settings.SAFE_BROWSING) {
      const batch = JSON.parse(data);
      if (batch.length > 0) {
        batch.forEach(eachMsg => hpnv2.action('telemetry', eachMsg));
      }
      if (callback) {
        callback({ response: '{"success":true}' });
      }
      return null;
    }

    if (url.startsWith(OFFER_TELEMETRY_PREFIX)) {
      const query = url.replace(OFFER_TELEMETRY_PREFIX, '');
      sendMessageOverHpn({
        action: 'offers-api',
        type: 'cliqz',
        ts: '',
        ver: '1.5',
        payload: query,
        rp: OFFER_TELEMETRY_PREFIX,
        body: data,
      }, callback, onerror);
      return null;
    }

    return proxyHttpHandler(method, url, callback, onerror, timeout, data, ...rest);
  }

  http.overrideHttpHandler(httpHandler);
  http.addCompressionExclusion(config.settings.SAFE_BROWSING);
  http.overrideFetchHandler(fetchHandler);
}


export function unload() {
  http.resetFetchHandler();
}
