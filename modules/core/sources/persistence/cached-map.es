import PersistentMap from './map';

// Like PersistentMap, but getters are synchronous

export default class CachedMap extends PersistentMap {
  constructor(...args) {
    super(...args);
    this.data = new Map();
  }

  init() {
    return super.init()
      .then(() => super.entries())
      .then((entries) => {
        entries.forEach(([key, value]) => {
          this.data.set(key, value);
        });
      });
  }

  unload() {
    this.data.clear();
    return super.unload();
  }

  get(key) {
    return this.data.get(key);
  }

  set(key, value) {
    this.data.set(key, value);
    return super.set(key, value);
  }

  has(key) {
    return this.data.has(key);
  }

  delete(key) {
    this.data.delete(key);
    return super.delete(key);
  }

  clear() {
    this.data.clear();
    return super.clear();
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
