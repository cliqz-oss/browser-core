/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default class Cache {
  constructor(size) {
    this.size = size;
    this.clear();
  }

  clear() {
    this.cache = [];
    for (let i = 0; i < this.size; i += 1) {
      this.cache.push({ key: null, value: null });
    }
  }

  get(key) {
    const val = this.cache[key.length % this.size];

    if (val.key !== key) {
      return undefined;
    }

    return val.value;
  }

  set(key, value) {
    const current = this.cache[key.length % this.size];
    current.key = key;
    current.value = value;
  }
}
