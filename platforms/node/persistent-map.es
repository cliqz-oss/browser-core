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
}
