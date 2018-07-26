import config from '../core/config';
import { fetch, Headers, Response } from '../platform/fetch';
import random from '../core/crypto/random';
import logger from './logger';
import { TransportError, WrongClockError, ServerError } from './errors';

async function myfetch(request, options) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TransportError('timeout')), 5000);
    fetch(request, options)
      .then((x) => {
        clearTimeout(timer);
        resolve(x);
      }).catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

// Just to have all the endpoints in the same place.
// Also handles possible clock drift of the user, syncing with time returned
// by our endpoints or 3rd party popular sites.

// At some point, we should do the transport in the most private way available
// for the platform, but for now just doing direct requests.
export default class Endpoints {
  static async post(url, _body) {
    let body = _body;
    const headers = new Headers();

    if (ArrayBuffer.isView(body)) {
      headers.append('Content-Type', 'application/octet-stream');
    } else if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      headers.append('Content-Type', 'application/json');
    }

    return myfetch(url, {
      method: 'POST',
      body,
      headers
    });
  }

  static async get(url) {
    return myfetch(url);
  }

  static get MAX_MINUTES_DRIFT() {
    return 3;
  }

  constructor({ maxRetries = 3, urls = config.settings } = {}) {
    this._reset();
    this.maxRetries = maxRetries;
    this.urls = urls;
  }

  _reset() {
    this.messages = [];
    this.sendTimer = null;
    this.unloaded = false;
  }

  // Fetch and sync time
  async _fetch(p) {
    return p.then((r) => {
      const date = r.headers.get('Date');
      const responseTime = (new Date(date)).getTime() || 0;

      if (Math.abs(Date.now() - responseTime) > Endpoints.MAX_MINUTES_DRIFT * 60 * 1000) {
        throw new WrongClockError();
      }
      if (!r.ok) {
        throw new ServerError(r.statusText);
      }
      return r;
    });
  }

  _scheduleSend() {
    if (this.unloaded || this.sendTimer !== null) {
      return;
    }
    this.sendTimer = setTimeout(() => {
      const n = Math.floor(random() * this.messages.length);
      const [msg, cnt] = this.messages.splice(n, 1)[0];
      this._fetch(Endpoints.post(this.urls.ENDPOINT_HPNV2_COLLECTOR, msg))
        .catch((e) => {
          if (cnt < this.maxRetries) {
            this.messages.push([msg, cnt + 1]);
          } else {
            logger.error('_scheduleSend failed (gave up after', this.maxRetries,
              'retry attempts)', e);
          }
        })
        .then(() => {
          this.sendTimer = null;
          if (this.messages.length > 0) {
            this._scheduleSend();
          }
        });
    }, 500 + Math.floor(random() * 1500)); // TODO: improve?
  }

  async send(msg, instant = false) {
    if (instant) {
      try {
        const response = await this._fetch(Endpoints.post(this.urls.ENDPOINT_HPNV2_COLLECTOR, msg));
        const { status, body } = await response.json();
        return new Response(body, { status });
      } catch (e) {
        if ((e instanceof ServerError) || (e instanceof WrongClockError)) {
          throw e;
        }
        throw new TransportError(e.message);
      }
    }
    this.messages.push([msg, 0]);
    this._scheduleSend();
    return new Response();
  }

  async join({ ts, joinMsg, pk, sig, hpnv2 }) {
    const response = await this._fetch(
      Endpoints.post(this.urls.ENDPOINT_HPNV2_JOIN, { ts, joinMsg, pk, sig, hpnv2 }));
    return response.json();
  }

  async getConfig() {
    const response = await this._fetch(Endpoints.get(this.urls.ENDPOINT_HPNV2_CONFIG));
    return response.json();
  }

  unload() {
    clearTimeout(this.sendTimer);
    this._reset();
    this.unloaded = true;
  }
}
