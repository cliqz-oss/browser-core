/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
export default class DefaultMap<K, V> {
  private map: Map<K, V>;
  private valueCtr: () => V;

  constructor(valueCtr: () => V, ...args: any[]) {
    this.map = new Map(...args);
    this.valueCtr = valueCtr;
  }

  toMap() {
    return this.map;
  }

  toObj() {
    const obj = Object.create(null);
    this.forEach((v: V, k: K) => {
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

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  entries() {
    return this.map.entries();
  }

  forEach(cb: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    return this.map.forEach(cb, thisArg);
  }

  get(key: K): V {
    let value: V | undefined = this.map.get(key);

    if (value === undefined) {
      value = this.valueCtr();
      this.set(key, value);
    }

    return value;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  keys() {
    return this.map.keys();
  }

  set(key: K, value: V) {
    this.map.set(key, value);
    return this;
  }

  values() {
    return this.map.values();
  }

  // Extra API

  update(key: K, updateFn: (v: V) => V | undefined): void {
    const value = this.get(key);
    const result = updateFn(value);
    this.set(key, result === undefined ? value : result);
  }
}
