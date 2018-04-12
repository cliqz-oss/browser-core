import CachedMap from '../../core/persistence/cached-map';

/**
 * This will implement the same interface than the CachedMap for a Map
 */
export default class CachedMapLocal {
  constructor() {
    this.data = new Map();
  }

  init() {
    return Promise.resolve();
  }

  unload() {
    this.data.clear();
  }

  get(key) {
    return this.data.get(key);
  }

  set(key, value) {
    this.data.set(key, value);
  }

  has(key) {
    return this.data.has(key);
  }

  delete(key) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
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

/**
 * This method will return a persistent cached map or a normal one depending
 * on storage flag
 */
/* eslint arrow-body-style: "off" */
const buildCachedMap = (id, shouldPersist) => {
  return (shouldPersist) ? new CachedMap(id) : new CachedMapLocal();
};


export {
  buildCachedMap
};
