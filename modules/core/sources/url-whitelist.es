import { utils } from './cliqz';
import { getPref, clearPref } from './prefs';
import tlds from './tlds';
import { LazyPersistentObject } from '../antitracking/persistent-state';
import Logger from './logger';


export default class UrlWhitelist {
  constructor(whitelistName, legacyPref) {
    this.whitelist = new Set();
    this.whitelistPersist = new LazyPersistentObject(whitelistName);
    this.logger = Logger({
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
      if (value === tlds.getGeneralDomain(value)) {
        newValue = `g:${value}`;
      } else if (value === tlds.extractHostname(value)) {
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
    const existingList = getPref(prefName, null);
    if (existingList) {
      this.whitelist = new Set(existingList);
    }
    clearPref(prefName);
    this.persistWhitelist();
  }

  isWhitelisted(url) {
    return this.whitelist.has(`u:${utils.cleanUrlProtocol(url, true)}`) ||
      this.whitelist.has(`h:${tlds.extractHostname(url)}`) ||
      this.whitelist.has(`g:${tlds.getGeneralDomain(url)}`);
  }

  getState(url) {
    return {
      url: this.whitelist.has(`u:${utils.cleanUrlProtocol(url, true)}`),
      hostname: this.whitelist.has(`h:${tlds.extractHostname(url)}`),
      generalDomain: this.whitelist.has(`g:${tlds.getGeneralDomain(url)}`)
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
        processed = `u:${utils.cleanUrlProtocol(url, true)}`;
        break;
      case 'hostname':
        processed = `h:${tlds.extractHostname(url)}`;
        break;
      case 'generalDomain':
        processed = `g:${tlds.getGeneralDomain(url)}`;
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
