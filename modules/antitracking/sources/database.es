/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getDexie from '../platform/lib/dexie';

export default class AttrackDatabase {
  constructor() {
    this.db = null;
    this._ready = null;
  }

  init() {
    if (this.db !== null) return Promise.resolve();

    this._ready = getDexie().then((Dexie) => {
      this.db = new Dexie('antitracking');
      const tables = {
        tokenDomain: '[token+fp], token, mtime',
        tokenBlocked: 'token, expires',
        requestKeyValue: '[tracker+key+value], [tracker+key], day',
      };
      this.db.version(2).stores({
        ...tables,
        tokens: 'token, lastSent, created',
        keys: 'hash, lastSent, created',
      });

      this.db.version(1).stores(tables);

      return this.db.open();
    });
    return this._ready;
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }

  get ready() {
    if (this._ready === null) {
      return Promise.reject(new Error('init not called'));
    }
    return this._ready;
  }

  get tokenDomain() {
    return this.db.tokenDomain;
  }

  get tokenBlocked() {
    return this.db.tokenBlocked;
  }

  get requestKeyValue() {
    return this.db.requestKeyValue;
  }

  get tokens() {
    return this.db.tokens;
  }

  get keys() {
    return this.db.keys;
  }
}
