/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
