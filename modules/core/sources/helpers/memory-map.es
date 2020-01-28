/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * An in-memory implementation of `PersistentMap`. It can be used as a fallback
 * for when IndexedDB is not available (e.g.: private mode).
 */
export default class MemoryPersistentMap {
  constructor() {
    this.db = new Map();
  }

  init() {
    return Promise.resolve();
  }

  unload() {
    this.db.clear();
  }

  async destroy() {
    this.db.clear();
  }

  async get(key) {
    return this.db.get(key);
  }

  async set(key, value) {
    this.db.set(key, value);
  }

  async bulkSetFromMap(map) {
    map.forEach((value, key) => this.db.set(key, value));
  }

  async has(key) {
    return this.db.has(key);
  }

  async delete(key) {
    this.db.delete(key);
  }

  async bulkDelete(keys) {
    keys.forEach(key => this.db.delete(key));
  }

  async clear() {
    this.db.clear();
  }

  async size() {
    return this.db.size;
  }

  async keys() {
    return [...this.db.keys()];
  }

  async values() {
    return [...this.db.values()];
  }

  async entries() {
    return [...this.db.entries()];
  }
}
