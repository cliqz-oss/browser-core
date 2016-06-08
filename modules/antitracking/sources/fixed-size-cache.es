/** Fixed length lookup cache. Allows expensive operations to be cached for later lookup. Once
    the cache limit is exceeded, least recently used values are removed.
*/
export default class {

  constructor(item_ctor, size) {
    this._cache_limit = size;
    this._cache = {};
    this._lru = [];
    this._item_ctor = item_ctor;
    this._hit_ctr = 0;
    this._miss_ctr = 0;
    this._keysize_limit = 1000;
  }

  get(key) {
    if (key in this._cache) {
      // cache hit, remove key from lru list
      let ind = this._lru.indexOf(key);
      if (ind != -1) {
          this._lru.splice(ind, 1);
      }
      this._hit_ctr++;
    } else {
      // cache miss, generate value for key
      if (!key || key.length > this._keysize_limit) {
          // if key is large, don't cache
          return this._item_ctor(key);
      }
      this._cache[key] = this._item_ctor(key);
      // prune cache - take from tail of list until short enough
      while (this._lru.length > this._cache_limit) {
          let lru = this._lru.pop();
          delete this._cache[lru];
      }
      this._miss_ctr++;
    }
    // add key to head of list
    this._lru.unshift(key);
    return this._cache[key];
  }

}
