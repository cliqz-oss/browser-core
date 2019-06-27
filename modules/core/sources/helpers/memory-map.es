
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

  async has(key) {
    return this.db.has(key);
  }

  async delete(key) {
    this.db.delete(key);
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
