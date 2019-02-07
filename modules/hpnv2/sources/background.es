import background from '../core/base/background';
import Manager from './manager';
import config from '../core/config';
import { overRideCliqzResults, unload } from './http-handler-patch';
import prefs from '../core/prefs';

export default background({
  requiresServices: ['cliqz-config'],
  init() {
    if (prefs.get('proxyNetwork', true)) {
      this.proxy = true;
      overRideCliqzResults();
    }
    this.manager = new Manager();
    return this.manager.init();
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
    async send(msg) {
      return this.manager.send(msg);
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

        if (rp.startsWith(config.settings.RESULTS_PROVIDER_PING)) {
          const res = await this.manager.send({ action: 'search', method: 'HEAD', path: '/ping', payload: {} });
          const text = await res.text();
          return text;
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
  },
});
