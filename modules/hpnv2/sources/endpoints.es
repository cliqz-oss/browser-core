import config from '../core/config';
import { fetch, Headers } from '../platform/fetch';
import random from '../core/crypto/random';
import { TransportError } from './errors';

function myfetch(request, options) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TransportError()), 5000);
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
  static post(url, _body) {
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

  static get(url) {
    return myfetch(url);
  }

  static head(url) {
    return myfetch(url, { method: 'HEAD' });
  }

  static getServerTime(url) {
    return Endpoints.head(url)
      .then((r) => {
        const date = r.headers.get('Date');
        const time = (new Date(date)).getTime();
        if (!time) {
          throw new Error('Server returned bad date');
        }
        return time;
      });
  }
  // If time returned by CLIQZ is different than local time, we rely on time by 3rd parties.
  // TODO: Is this ok to use these urls? Should we try several ones just in case?
  static get3rdPartyTime() {
    const urls = [
      'https://www.google.com',
      'https://www.youtube.com',
      'https://www.baidu.com',
      'https://www.wikipedia.org',
      'https://www.yahoo.com',
      'https://www.reddit.com'
    ];
    const url = urls[Math.floor(urls.length * Math.random())];
    return Endpoints.getServerTime(url);
  }
  static get MAX_TIME_DRIFT() {
    return 1000 * 60 * 3; // TODO: 3 minutes is ok?
  }

  constructor({ maxRetries = 3, urls = config.settings } = {}) {
    this._reset();
    this.maxRetries = maxRetries;
    this.urls = urls;
  }

  _reset() {
    this.timeOffset = 0;
    this.messages = [];
    this.sendTimer = null;
    this.unloaded = false;
  }

  getTime() {
    return Date.now() + this.timeOffset;
  }

  // Fetch and sync time
  _fetch(p) {
    return p.then((r) => {
      const date = r.headers.get('Date');
      const responseTime = (new Date(date)).getTime() || 0;

      let pr = Promise.resolve();
      if (Math.abs(this.getTime() - responseTime) > Endpoints.MAX_TIME_DRIFT) {
        pr = Endpoints.get3rdPartyTime().then((serverTime) => {
          this.timeOffset = serverTime - Date.now();
        }).catch(() => {});
      }
      return pr.then(() => {
        if (!r.ok) {
          throw new Error(r.statusText);
        }
        return r.json();
      });
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
        .catch(() => {
          if (cnt < this.maxRetries) {
            this.messages.push([msg, cnt + 1]);
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

  send(msg) {
    this.messages.push([msg, 0]);
    this._scheduleSend();
  }

  join({ ts, joinMsg, pk, sig }) {
    return this._fetch(
      Endpoints.post(this.urls.ENDPOINT_HPNV2_JOIN, { ts, joinMsg, pk, sig })
    );
  }

  getConfig() {
    return this._fetch(Endpoints.get(this.urls.ENDPOINT_HPNV2_CONFIG));
  }

  unload() {
    clearTimeout(this.sendTimer);
    this._reset();
    this.unloaded = true;
  }
}
