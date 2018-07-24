import { cleanUrlProtocol } from './url';
import prefs from './prefs';
import { getGeneralDomain, extractHostname } from './tlds';
import { LazyPersistentObject } from '../core/persistent-state';
import Logger from './logger';


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
    this.whitelistPersist.setValue({
      urls: [...this.whitelist.values()]
    });
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

  isWhitelisted(url) {
    return this.whitelist.has(`u:${cleanUrlProtocol(url, true)}`) ||
      this.whitelist.has(`h:${extractHostname(url)}`) ||
      this.whitelist.has(`g:${getGeneralDomain(url)}`);
  }

  getState(url) {
    return {
      url: this.whitelist.has(`u:${cleanUrlProtocol(url, true)}`),
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
        processed = `u:${cleanUrlProtocol(url, true)}`;
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
