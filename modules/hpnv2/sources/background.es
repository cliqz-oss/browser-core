/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import Manager from './manager';
import config from '../core/config';
import { parse } from '../core/url';
import { overRideCliqzResults, unload } from './http-handler-patch';
import prefs from '../core/prefs';
import logger from './logger';

export default background({
  requiresServices: ['cliqz-config', 'pacemaker'],
  init() {
    if (prefs.get('proxyNetwork', true)) {
      this.proxy = true;
      overRideCliqzResults();
    }
    this.manager = new Manager();
    this.manager.init().catch((e) => {
      logger.error('Unexpected error when trying to initialize hpnv2', e);
    });
  },

  unload() {
    if (this.proxy) {
      delete this.proxy;
      unload();
    }
    if (this.manager) {
      this.manager.unload();
      this.manager = null;
    }
  },

  status() {
    return {
      visible: true,
      state: prefs.get('hpn-query'),
    };
  },

  actions: {
    async send(...args) {
      return this.manager.send(...args);
    },
    async sendLegacy(msg) {
      const { action, payload, body, rp } = msg;
      if (action === 'instant') {
        if (rp === config.settings.BW_URL) {
          const res = await this.manager.send({ action: 'antiphishingv2', payload: '', method: 'GET', path: `/${payload}` });
          const text = await res.text();
          return text;
        }

        if (rp.startsWith(config.settings.ENDPOINT_SAFE_QUORUM_ENDPOINT)) {
          const path = rp.replace((config.settings.ENDPOINT_SAFE_QUORUM_ENDPOINT), '');
          const res = await this.manager.send({ action: 'safe-browsing-quorum', path, payload, method: 'GET' });
          const { result } = await res.json();
          if (result === undefined) {
            throw new Error('Could not parse result from quorum server (expected "result" field)');
          }
          return result;
        }

        throw new Error(`hpnv2: instant not implemented ${rp}`);
      }

      if (action === 'extension-result-telemetry') {
        const res = await this.manager.send({ action, payload: `q=${payload}`, method: 'GET' });
        const text = await res.text();
        return text;
      }

      if (action === 'offers-api') {
        const res = await this.manager.send({ action, path: payload, payload: body, method: 'POST' });
        const text = await res.text();
        return text;
      }

      throw new Error(`Unknown legacy msg action ${action}`);
    },
    async sendInstantMessage(rp, payload) {
      const message = {
        action: 'instant',
        type: 'cliqz',
        ts: '',
        ver: '1.5',
        payload,
        rp,
      };
      // CliqzSecureMessage.callListeners(message);
      return this.actions.sendLegacy(message);
    },
    async sendTelemetry(msg) {
      // TODO: this will also drop attrack messages! (but that was previous behaviour)
      if (prefs.get('humanWebOptOut', false)) {
        return undefined;
      }
      return this.actions.send(msg);
    },
    async telemetry(msg) {
      return this.actions.sendTelemetry(msg);
    },

    /**
     * ttl:
     *   Optional timeout. If set, it is the number of milliseconds to wait before we can
     *   assume that the user has moved on and is no longer interested in the results.
     */
    async search(url, { ttl = 15000 } = {}) {
      const { pathname, search, searchParams } = parse(url);
      return this.actions.send({
        action: 'search',
        method: 'GET',
        payload: search,
        path: pathname,
      }, { proxyBucket: searchParams.get('s'), ttl });
    },

    /**
     * Provides an interface to the trusted clock in hpnv2.
     *
     * It provides a server synchronized, low-resolution clock (expect no
     * higher resolution than to the nearest minute).
     *
     * In hpnv2, the synchronization is needed to to eliminate drift (if the
     * system clock is unreliable on the user's machine) and to detect edge case
     * where the local system time jumps (typcially it jumps ahead, for example,
     * if a machine awakes from suspend).
     *
     * Warning: Be careful if "inSync" is false. You will still get an estimate
     * of the time, but if possible you should discard it and wait for the
     * clock to get in sync again.
     */
    getTime() {
      const { inSync, minutesSinceEpoch } = this.manager.trustedClock.checkTime();
      const msSinceEpoche = minutesSinceEpoch * 60 * 1000;
      const utcTimestamp = new Date(msSinceEpoche);
      return {
        inSync,
        minutesSinceEpoch,
        utcTimestamp,
      };
    }
  },
});
