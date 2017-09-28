export default class DefaultWeakMap {
  constructor(generator) {
    this._map = new WeakMap();
    this._generator = generator;
  }

  get(key) {
    if (this._map.has(key)) {
      return this._map.get(key);
    }
    const val = this._generator(key);
    this._map.set(key, val);
    return val;
  }

  has(key) {
    return this._map.has(key);
  }

  set(key, val) {
    return this._map.set(key, val);
  }

  delete(key) {
    return this._map.delete(key);
  }
}
