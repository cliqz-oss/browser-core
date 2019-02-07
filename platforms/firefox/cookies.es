/* eslint { "no-unused-vars": "off" } */
import { Components, Services, XPCOMUtils } from './globals';

const DEFAULT_STORE = 'firefox-default';
const PRIVATE_STORE = 'firefox-private';
const CONTAINER_STORE = 'firefox-container-';

const SAME_SITE_STATUSES = [
  'no_restriction',
  'lax',
  'strict',
];

// From webextensions
// https://github.com/mozilla/gecko-dev/blob/master/toolkit/components/extensions/parent/ext-cookies.js
const convertCookie = ({ cookie, isPrivate }) => {
  const result = {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.host,
    hostOnly: !cookie.isDomain,
    path: cookie.path,
    secure: cookie.isSecure,
    httpOnly: cookie.isHttpOnly,
    session: cookie.isSession,
    firstPartyDomain: cookie.originAttributes.firstPartyDomain || '',
    sameSite: SAME_SITE_STATUSES[cookie.sameSite],
  };

  if (!cookie.isSession) {
    result.expirationDate = cookie.expiry;
  }

  if (cookie.originAttributes.userContextId) {
    // use of getCookieStoreIdForContainer removed
    result.storeId = cookie.originAttributes.userContextId;
  } else if (cookie.originAttributes.privateBrowsingId || isPrivate) {
    result.storeId = PRIVATE_STORE;
  } else {
    result.storeId = DEFAULT_STORE;
  }

  return result;
};

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
    }
    if (this._cookie.originAttributes.privateBrowsingId) {
      return PRIVATE_STORE;
    }
    return DEFAULT_STORE;
  }

  get sameSite() {
    return this._cookie.sameSite;
  }
}

export class CookieStore {}

export class OnChangeCause {}

// based on webextensions implementation from
// https://github.com/mozilla/gecko-dev/blob/master/toolkit/components/extensions/parent/ext-cookies.js
class OnCookieChangedListener {
  constructor() {
    this._listeners = new Set();
    this._observer = this._observer.bind(this);
  }

  _observer(subject, topic, data) {
    const notify = (removed, cookie, cause) => {
      cookie.QueryInterface(Components.interfaces.nsICookie2);
      const event = {
        removed,
        cookie: convertCookie({ cookie, isPrivate: topic === 'private-cookie-changed' }),
        cause,
      };
      this._listeners.forEach((fn) => {
        setTimeout(() => fn(event), 0);
      });
    };

    // We do our best effort here to map the incompatible states.
    switch (data) {
      case 'deleted':
        notify(true, subject, 'explicit');
        break;
      case 'added':
        notify(false, subject, 'explicit');
        break;
      case 'changed':
        notify(true, subject, 'overwrite');
        notify(false, subject, 'explicit');
        break;
      case 'batch-deleted':
        subject.QueryInterface(Components.interfaces.nsIArray);
        for (let i = 0; i < subject.length; i += 1) {
          const cookie = subject.queryElementAt(i, Components.interfaces.nsICookie2);
          if (!cookie.isSession && cookie.expiry * 1000 <= Date.now()) {
            notify(true, cookie, 'expired');
          } else {
            notify(true, cookie, 'evicted');
          }
        }
        break;
      default:
        break;
    }
  }

  addListener(listener) {
    if (this._listeners.size === 0) {
      Services.obs.addObserver(this._observer, 'cookie-changed');
    }
    this._listeners.add(listener);
  }

  removeListener(listener) {
    this._listeners.delete(listener);
    if (this._listeners.size === 0) {
      Services.obs.removeObserver(this._observer, 'cookie-changed');
    }
  }
}

export default {
  get({ url, name, storeId }) {
    return Promise.reject(new Error('not yet implemented'));
  },
  getAll({ url, name, domain, path, secure, session, storeId }) {
    // Currently only returns all cookies. Filtering is not yet implemented
    let enumerator;
    try {
      enumerator = XPCOMUtils.IterSimpleEnumerator(
        Services.cookies.enumerator,
        Components.interfaces.nsICookie2
      );
    } catch (e) {
      enumerator = Services.cookies.getCookiesWithOriginAttributes(
        JSON.stringify({
          privateBrowsingId: 0,
        }), domain
      );
    }
    const cookies = [];
    for (const cookie of enumerator) {
      cookies.push(new Cookie(cookie));
    }
    return Promise.resolve(cookies);
  },
  set(details, callback) {
    const { url, name, value, domain, path, secure, httpOnly, expirationDate, storeId,
      firstPartyDomain } = details;
    const isSession = !expirationDate;
    const expiry = isSession ? Number.MAX_SAFE_INTEGER : expirationDate;

    // this is simplified because we assume we don't have containers here
    const originAttributes = {
      userContextId: 0,
      privateBrowsingId: storeId === PRIVATE_STORE ? 1 : 0,
      firstPartyDomain,
    };
    try {
      Services.cookies.add(domain, path, name, value,
        secure, httpOnly, isSession, expiry, originAttributes);
    } catch (e) {
      // since FF64, there is an extra argument `sameSite`
      const sameSite = SAME_SITE_STATUSES.indexOf(details.sameSite) || SAME_SITE_STATUSES[0];
      Services.cookies.add(domain, path, name, value,
        secure, httpOnly, isSession, expiry, originAttributes, sameSite);
    }
    if (callback) {
      callback(details);
    }
  },
  remove({ url, name, cookie, storeId, firstPartyDomain }, callback) {
    // cookie is non standard option
    if (cookie) {
      Services.cookies.remove(cookie.domain, cookie.name, cookie.path, false,
        cookie._cookie.originAttributes);
      return;
    }
    const originAttributes = {
      userContextId: 0,
      privateBrowsingId: storeId === PRIVATE_STORE ? 1 : 0,
      firstPartyDomain,
    };
    const [,, domain, path] = url.split('/', 4);
    Services.cookies.remove(domain, name, path, false, originAttributes);
    if (callback) {
      callback();
    }
  },
  getAllCookieStores() {
    return Promise.resolve([DEFAULT_STORE, PRIVATE_STORE]);
  },
  onChanged: new OnCookieChangedListener(),
};
