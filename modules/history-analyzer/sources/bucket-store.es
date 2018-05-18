import getDexie from '../platform/lib/dexie';

/**
 * BucketStore implements a persistent key-value store on top of Dexie. Keys
 * must be valid timestamps (as returned by `Date.now()`). It also keeps an
 * in-memory index to make most operations sync and fast.
 */
export default class BucketStore {
  constructor(name) {
    this.cache = new Map();

    this.name = name;
    this.db = null;
  }

  get size() {
    return this.cache.size;
  }

  initMemoryCache() {
    this.cache = new Map();
    return this.db.kv.each(({ ts, value }) => {
      this.cache.set(ts, value);
    });
  }

  init() {
    return getDexie()
      .then((Dexie) => {
        this.db = new Dexie(this.name);
        this.db.version(1).stores({ kv: 'ts' });
      })
      .then(() => this.db.open())
      .then(() => this.initMemoryCache());
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }

  destroy() {
    if (this.db === null) {
      return getDexie().then(Dexie => Dexie.delete(this.name));
    }

    return this.db.delete();
  }

  deleteDataOlderThan(ts) {
    return this.db.kv.where('ts').below(ts).delete()
      .then(() => this.initMemoryCache());
  }

  has(ts) {
    return this.cache.has(ts);
  }

  get(ts) {
    return this.cache.get(ts);
  }

  set(ts, value) {
    this.cache.set(ts, value);
    return this.db.kv.put({ ts, value });
  }

  keys() {
    return [...this.cache.keys()];
  }

  values() {
    return [...this.cache.values()];
  }

  entries() {
    return [...this.cache.entries()];
  }

  forEach(...args) {
    this.cache.forEach(...args);
  }

  update(ts, processFn) {
    return this.set(ts, processFn(this.get(ts)));
  }
}
