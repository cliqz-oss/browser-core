/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import LRU from '../LRU';
/* Fixed length lookup cache. Allows expensive operations to be cached for later lookup. Once
 * the cache limit is exceeded, least recently used values are removed.
 */
export default class FixedSizeCache {
  /* @param {function} buildValue - used to build a new value from key in case of cache miss.
   * @param {number} size - maximum elements stored in cache.
   * @param {function} buildKey - [Optional] used to extract key from argument.
   */
  constructor(buildValue, size, buildKey) {
    this._buildValue = buildValue;
    this._buildKey = buildKey;
    this._maxKeySize = 1000;

    // Statistics
    this._hitCounter = 0;
    this._missCounter = 0;

    this.lru = new LRU(size);
  }

  /* Try to retrieve the value associated with `key` from the cache. If it's
   * not present, build it using `buildValue` and store it in the cache.
   *
   * This method always returns a value either from the LRU cache, or from a
   * direct call to `buildValue`.
   */
  get(argument) {
    const key = this._buildKey ? this._buildKey(argument) : argument;
    let value = this.lru.get(key);

    if (value !== undefined) {
      // Cache hit
      this._hitCounter += 1;
      return value;
    }
    // Cache miss
    this._missCounter += 1;

    // Compute value
    value = this._buildValue(argument);

    // if key is large, don't cache
    if (!key || key.length > this._maxKeySize) {
      return value;
    }

    this.lru.set(key, value);
    return value;
  }
}
