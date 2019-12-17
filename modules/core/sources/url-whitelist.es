/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parse } from './url';
import prefs from './prefs';
import { getGeneralDomain, extractHostname } from './tlds';
import { LazyPersistentObject } from '../core/persistent-state';
import Logger from './logger';
import md5 from './helpers/md5';

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
        // old format: `h:example.com` - presence of `.` indicates upgrade required
        if (value.urls.some(url => url.indexOf('.') !== -1)) {
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
      const type = value.slice(0, 1);
      const url = value.slice(2);
      w.add(`${type}:${md5(url)}`);
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

    if (this.whitelist.has(`u:${md5(url)}`)) {
      return true;
    }

    if (hostname === null || domain === null) {
      const info = parse(url);
      if (info === null) {
        return false;
      }

      // eslint-disable-next-line no-param-reassign
      hostname = hostname === null ? info.hostname : hostname;
      // eslint-disable-next-line no-param-reassign
      domain = domain === null ? info.generalDomain : domain;
    }

    return this.whitelist.has(`g:${md5(domain)}`) || this.whitelist.has(`h:${md5(hostname)}`);
  }

  getState(url) {
    return {
      url: this.whitelist.has(`u:${md5(url)}`),
      hostname: this.whitelist.has(`h:${md5(extractHostname(url))}`),
      generalDomain: this.whitelist.has(`g:${md5(getGeneralDomain(url))}`)
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
        processed = `u:${md5(url)}`;
        break;
      case 'hostname':
        processed = `h:${md5(extractHostname(url))}`;
        break;
      case 'generalDomain':
        processed = `g:${md5(getGeneralDomain(url))}`;
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
