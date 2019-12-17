/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getDexie from '../platform/lib/dexie';

export default class PersistentMap {
  constructor(dbName) {
    this.dbName = dbName;
    this.db = null;
  }

  init() {
    return getDexie().then((Dexie) => {
      this.db = new Dexie(this.dbName);
      this.db.version(1).stores({ kv: 'key' });
      return this.db.open();
    });
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }

  destroy() {
    if (this.db !== null) {
      return this.db.delete();
    }

    return getDexie(Dexie => Dexie.delete(this.dbName));
  }

  get(key) {
    return this.db.kv.get(key).then(v => v && v.value);
  }

  set(key, value) {
    return this.db.kv.put({ key, value });
  }

  bulkSetFromMap(map) {
    const bulkObj = Array.from(map.entries(), ([key, value]) => ({ key, value }));
    return this.db.kv.bulkPut(bulkObj);
  }

  has(key) {
    return this.db.kv.get(key).then(v => v !== undefined);
  }

  delete(key) {
    return this.db.kv.delete(key);
  }

  bulkDelete(keys) {
    return this.db.kv.bulkDelete(keys);
  }

  clear() {
    return this.db.kv.clear();
  }

  size() {
    return this.db.kv.count();
  }

  keys() {
    return this.db.kv.toCollection().primaryKeys();
  }

  values() {
    return this.db.kv.toArray()
      .then(x => x.map(({ value }) => value));
  }

  entries() {
    return this.db.kv.toArray()
      .then(x => x.map(({ key, value }) => [key, value]));
  }
}
