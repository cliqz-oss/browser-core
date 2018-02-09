/* eslint { "no-unused-vars": "off" } */
import { Components, Services, XPCOMUtils } from './globals';

const DEFAULT_STORE = 'firefox-default';
const PRIVATE_STORE = 'firefox-private';
const CONTAINER_STORE = 'firefox-container-';

export class Cookie {
  constructor(nativeCookie) {
    this._cookie = nativeCookie;
  }

  toString() {
    const attrs = [];
    if (this.hostOnly) {
      attrs.push('hostOnly');
    }
    if (this.secure) {
      attrs.push('secure');
    }
    if (this.session) {
      attrs.push('session');
    }
    if (this.httpOnly) {
      attrs.push('httpOnly');
    }
    const attrString = attrs.join(' ');
    return `${this.domain}${this.path}: ${this.name}=${this.value}; ${attrString} (${this.storeId})`;
  }

  get name() {
    return this._cookie.name;
  }

  get value() {
    return this._cookie.value;
  }

  get domain() {
    return this._cookie.host;
  }

  get hostOnly() {
    return !this._cookie.isDomain;
  }

  get path() {
    return this._cookie.path;
  }

  get secure() {
    return this._cookie.isSecure;
  }

  get httpOnly() {
    return this._cookie.isHttpOnly;
  }

  get session() {
    return this._cookie.isSession;
  }

  get expirationDate() {
    return this._cookie.expires;
  }

  get storeId() {
    if (this._cookie.originAttributes.userContextId) {
      return CONTAINER_STORE + this._cookie.originAttributes.userContextId;
    } else if (this._cookie.originAttributes.privateBrowsingId) {
      return PRIVATE_STORE;
    }
    return DEFAULT_STORE;
  }
}

export class CookieStore {}

export class OnChangeCause {}

export default {
  get({ url, name, storeId }) {
    return Promise.reject('not yet implemented');
  },
  getAll({ url, name, domain, path, secure, session, storeId }) {
    // Currently only returns all cookies. Filtering is not yet implemented
    const cookies = [];
    for (const cookie of XPCOMUtils.IterSimpleEnumerator(Services.cookies.enumerator,
                                                         Components.interfaces.nsICookie2)) {
      cookies.push(new Cookie(cookie));
    }
    return Promise.resolve(cookies);
  },
  set({ url, name, value, domain, path, secure, httpOnly, expirationDate, storeId }) {
    return Promise.reject('not yet implemented');
  },
  remove({ url, name, cookie, storeId }) {
    // cookie is non standard option
    if (cookie) {
      Services.cookies.remove(cookie.domain, cookie.name, cookie.path, false,
        cookie._cookie.originAttributes);
      return Promise.resolve();
    }
    return Promise.reject('not yet implemented');
  },
  getAllCookieStores() {
    return Promise.resolve([DEFAULT_STORE, PRIVATE_STORE]);
  }
};
