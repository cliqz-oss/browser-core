/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import storage from 'node-persist';

export default class PersistentMap {
  constructor(dbName) {
    this.dbName = dbName;
    this.db = storage.create({
      dir: `tmp/${dbName}`,
    });
  }

  init() {
    return this.db.init();
  }

  unload() {
    return this.db.persist();
  }

  get(key) {
    return this.db.getItem(key);
  }

  set(key, value) {
    return this.db.setItem(key, value);
  }

  has(key) {
    return this.db.getItem(key).then(v => v !== undefined);
  }

  delete(key) {
    return this.db.removeItem(key);
  }

  clear() {
    return this.db.clear();
  }

  size() {
    return this.db.length();
  }

  keys() {
    return this.db.keys();
  }

  entries() {
    const entries = [];
    this.db.forEach((key, value) => entries.push([key, value]));
    return Promise.resolve(entries);
  }

  bulkDelete() {
    throw new Error('not implemented');
  }

  bulkSetFromMap() {
    throw new Error('not implemented');
  }
}
