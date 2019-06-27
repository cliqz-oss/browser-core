import background from '../core/base/background';
import Manager from './manager';
import config from '../core/config';
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
  actions: {
    async send(...args) {
      return this.manager.send(...args);
    },
    async sendLegacy(msg) {
      const { action, payload, body, rp } = msg;
      if (action === 'instant') {
        if (rp === config.settings.BW_URL) {
          const res = await this.manager.send({ action: 'antiphishing', payload: `md5=${payload}`, method: 'GET' });
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
    async search(url) {
      const { pathname, search, searchParams } = new URL(url);
      return this.actions.send({
        action: 'search',
        method: 'GET',
        payload: search,
        path: pathname,
      }, { proxyBucket: searchParams.get('s') });
    },
  },
});
