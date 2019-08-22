/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getDexie from '../platform/lib/dexie';
import prefs from './prefs';
import console from './console';

const MAX_MIGRATE_COUNT = 3;

export default class Pouch2Dexie {
  constructor(dbName) {
    this.dbName = dbName;
    this.db = null;
  }

  async init() {
    const Dexie = await getDexie();
    const dexieExists = await Dexie.exists(this.dbName);
    this.db = new Dexie(this.dbName);
    this.db.version(1).stores({ kv: 'key' });
    await this.db.open();
    if (dexieExists) {
      return null; // No need to migrate if the dexie version exists
    }

    // migrate if needed
    const pouchName = `_pouch_${this.dbName}`;
    const pouchExists = await Dexie.exists(pouchName);
    if (pouchExists) {
      console.log(`Migrate ${this.dbName}`);
      const migrateCountPref = `pouch_migrate_count_${this.dbName}`;
      let migrateCount = prefs.get(migrateCountPref, MAX_MIGRATE_COUNT);
      if (migrateCount === 0) {
        // Failed attempts reach maximal count, clear pouchdb
        const pouch = new Dexie(`_pouch_${this.dbName}`);
        await pouch.open();
        await pouch.delete();
        pouch.close();
        prefs.clear(migrateCountPref);
        return null;
      }

      let migrateFinished = false;
      while (!migrateFinished && migrateCount > 0) {
        migrateCount -= 1;
        prefs.set(migrateCountPref, migrateCount);
        try {
          /* eslint-disable-next-line */
          migrateFinished = await this.migrate();
        } catch (error) {
          console.log(`Error while migrate, ${error}`);
        }
      }
    }
    return null;
  }

  async migrate() {
    await prefs.init();
    const Dexie = await getDexie();
    const pouch = new Dexie(`_pouch_${this.dbName}`);
    await pouch.open();
    const documentStore = await pouch.table('document-store');
    const bySequence = await pouch.table('by-sequence');
    const keys = await documentStore.toCollection().primaryKeys();
    const existingKeyValues = await Promise.all(keys.map(async (key) => {
      // Get the rev id
      const revData = await documentStore.get(key);
      const { rev } = JSON.parse(revData.data);
      const seqKey = `${key}::${rev}`;
      const value = await bySequence.get({ _doc_id_rev: seqKey });
      return [key, value];
    }));
    await this.db.transaction('rw', this.db.kv, async () => {
      await Promise.all(existingKeyValues.map(([key, value]) =>
        this._set(key, { ...value, _id: key })));
    });
    await pouch.delete();
    pouch.close();
    return true;
  }

  // Mock only used pouch api
  async info() {
    const count = await this._size();
    return {
      doc_count: count
    };
  }

  put(doc) {
    return this._set(doc._id, doc);
  }

  remove(doc) {
    return this._delete(doc._id);
  }

  get(key) {
    return this._get(key);
  }

  bulkDocs(docs) {
    return Promise.all(docs.map(async (doc) => {
      if (doc._delete) {
        return this.remove(doc);
      }
      return null;
    }));
  }

  allDocs() {
    return this._entries();
  }

  async destroy() {
    await this.db.delete();
    return this.db.close();
  }

  // Mostly copied from persistent-map
  _get(key) {
    return this.db.kv.get(key).then(v => v && v.value);
  }

  _set(key, value) {
    return this.db.kv.put({ key, value });
  }

  _delete(key) {
    return this.db.kv.delete(key);
  }

  _size() {
    return this.db.kv.count();
  }

  _entries() {
    return this.db.kv.toArray()
      .then(x => x.map(({ value }) => value));
  }
}
