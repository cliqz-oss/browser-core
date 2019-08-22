/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Copied from old hpn module
import prefs from '../core/prefs';
import * as http from '../core/http';
import config from '../core/config';
import inject from '../core/kord/inject';
import console from '../core/console';

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
}


export function unload() {
}
