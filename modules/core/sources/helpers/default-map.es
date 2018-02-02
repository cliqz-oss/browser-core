
/**
 * Equivalent to Python's default dict, but in Javascript with a Map!
 * It behaves exactly like a map, but allows you to specify a callback to be
 * used when a `key` does not exist in the Map yet.
 *
 * >>> const myMap = new DefaultMap(() => [])
 * >>> myMap.get('foo')
 * []
 * >> myMap.update('bar', v => v.push(42))
 * >> myMap
 * DefaultMap { 'foo' => [], 'bar' => [ 42 ] }
 */
export default class DefaultMap {
  constructor(valueCtr, ...args) {
    this.map = new Map(...args);
    this.valueCtr = valueCtr;
  }

  toMap() {
    return this.map;
  }

  toObj() {
    const obj = Object.create(null);
    this.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }

  get size() {
    return this.map.size;
  }

  clear() {
    return this.map.clear();
  }

  delete(...args) {
    return this.map.delete(...args);
  }

  entries(...args) {
    return this.map.entries(...args);
  }

  forEach(...args) {
    return this.map.forEach(...args);
  }

  get(key) {
    if (!this.has(key)) {
      this.set(key, this.valueCtr());
    }

    return this.map.get(key);
  }

  has(...args) {
    return this.map.has(...args);
  }

  keys(...args) {
    return this.map.keys(...args);
  }

  set(...args) {
    return this.map.set(...args);
  }

  values(...args) {
    return this.map.values(...args);
  }

  // Extra API

  update(key, updateFn) {
    const value = this.get(key);
    const result = updateFn(value);
    this.set(key, result === undefined ? value : result);
  }
}
