import persistentMapFactory from './map';

// Like PersistentMap, but getters are synchronous
export default class CachedMap {
  constructor(name) {
    this.name = name;
    this.data = new Map();
    this.db = null;
  }

  async init() {
    const PersistentMap = await persistentMapFactory();
    this.db = new PersistentMap(this.name);
    await this.db.init();
    (await this.db.entries()).forEach(([key, value]) => {
      this.data.set(key, value);
    });
  }

  unload() {
    this.data.clear();
    if (this.db !== null) {
      this.db.unload();
      this.db = null;
    }
  }

  get(key) {
    return this.data.get(key);
  }

  set(key, value) {
    this.data.set(key, value);
    if (this.db !== null) {
      return this.db.set(key, value);
    }
    return Promise.resolve();
  }

  has(key) {
    return this.data.has(key);
  }

  delete(key) {
    this.data.delete(key);
    if (this.db !== null) {
      return this.db.delete(key);
    }
    return Promise.resolve();
  }

  clear() {
    this.data.clear();
    if (this.db !== null) {
      return this.db.clear();
    }
    return Promise.resolve();
  }

  size() {
    return this.data.size;
  }

  keys() {
    return [...this.data.keys()];
  }

  entries() {
    return [...this.data.entries()];
  }
}
