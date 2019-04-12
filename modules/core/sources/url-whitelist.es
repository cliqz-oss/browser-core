import { URLInfo } from './url-info';
import prefs from './prefs';
import { getGeneralDomain, extractHostname } from './tlds';
import { LazyPersistentObject } from '../core/persistent-state';
import Logger from './logger';
import { isOnionModeFactory } from './platform';

const isOnionMode = isOnionModeFactory(prefs);

export default class UrlWhitelist {
  constructor(whitelistName, legacyPref) {
    this.whitelist = new Set();
    this.whitelistPersist = new LazyPersistentObject(whitelistName);
    this.logger = Logger.get('core', {
      prefix: `url-whitelist:${whitelistName}`,
    });
    if (legacyPref) {
      this.migrate(legacyPref);
    }
  }

  init() {
    return this.whitelistPersist.load().then((value) => {
      if (value.urls !== undefined) {
        this.whitelist = new Set(value.urls);
        if (value.urls.some(url => url.charAt(1) !== ':')) {
          this.upgrade();
        }
      }
    });
  }

  clear() {
    this.whitelist.clear();
    this.persistWhitelist();
  }

  persistWhitelist() {
    // We want to avoid persisting any data to disk in onion-mode.
    if (!isOnionMode()) {
      this.whitelistPersist.setValue({
        urls: [...this.whitelist.values()]
      });
    }
  }

  upgrade() {
    const w = new Set();
    this.whitelist.forEach((value) => {
      let newValue;
      if (value === getGeneralDomain(value)) {
        newValue = `g:${value}`;
      } else if (value === extractHostname(value)) {
        newValue = `h:${value}`;
      } else {
        newValue = `u:${value}`;
      }
      w.add(newValue);
    });
    this.whitelist = w;
    this.persistWhitelist();
  }

  migrate(prefName) {
    const existingList = prefs.get(prefName, null);
    if (existingList) {
      this.whitelist = new Set(existingList);
    }
    prefs.clear(prefName);
    this.persistWhitelist();
  }

  isWhitelisted(url, hostname = null, domain = null) {
    if (this.whitelist.size === 0) {
      return false;
    }

    if (this.whitelist.has(`u:${url}`)) {
      return true;
    }

    if (hostname === null || domain === null) {
      const info = URLInfo.get(url);
      if (info === null) {
        return false;
      }

      // eslint-disable-next-line no-param-reassign
      hostname = hostname === null ? info.hostname : hostname;
      // eslint-disable-next-line no-param-reassign
      domain = domain === null ? info.generalDomain : domain;
    }

    return this.whitelist.has(`g:${domain}`) || this.whitelist.has(`h:${hostname}`);
  }

  getState(url) {
    return {
      url: this.whitelist.has(`u:${url}`),
      hostname: this.whitelist.has(`h:${extractHostname(url)}`),
      generalDomain: this.whitelist.has(`g:${getGeneralDomain(url)}`)
    };
  }

  clearState(url) {
    this.changeState(url, 'url', 'remove', true);
    this.changeState(url, 'hostname', 'remove', true);
    this.changeState(url, 'generalDomain', 'remove', true);
    this.persistWhitelist();
  }

  changeState(url, type, action, deferPersist) {
    this.logger.log(url, type, action, 'changeState');
    let processed;
    switch (type) {
      case 'url':
        processed = `u:${url}`;
        break;
      case 'hostname':
        processed = `h:${extractHostname(url)}`;
        break;
      case 'generalDomain':
        processed = `g:${getGeneralDomain(url)}`;
        break;
      default:
        throw new Error('Supported types: url, hostname, generalDomain', type);
    }

    if (!processed) {
      this.logger.log('Not valid', type, url);
      return;
    }

    switch (action) {
      case 'add':
        this.whitelist.add(processed);
        break;
      case 'remove':
        this.whitelist.delete(processed);
        break;
      case 'toggle':
        if (this.whitelist.has(processed)) {
          this.whitelist.delete(processed);
        } else {
          this.whitelist.add(processed);
        }
        break;
      default:
        this.logger.error('Supprted actions: add, remove, toggle', action);
        return;
    }
    if (!deferPersist) {
      this.persistWhitelist();
    }
  }
}
