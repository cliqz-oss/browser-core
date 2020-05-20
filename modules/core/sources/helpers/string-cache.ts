/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default class Cache<Value> {
  public readonly size: number;
  public readonly cache: Array<{ key: string | undefined; value: Value | undefined }> = [];
  private bitMask: number;

  constructor(size: number) {
    if (size <= 0 || size & (size - 1) !== 0) {
      throw new Error('size must be a power of 2');
    }
    this.size = size;
    this.bitMask = size - 1;
    this.clear();
  }

  clear() {
    this.cache.length = 0;
    for (let i = 0; i < this.size; i += 1) {
      this.cache.push({ key: undefined, value: undefined });
    }
  }

  get(key: string): Value | undefined {
    const val = this.cache[key.length & this.bitMask];

    if (val.key !== key) {
      return undefined;
    }

    return val.value;
  }

  set(key: string, value: Value): Value {
    const current = this.cache[key.length & this.bitMask];
    current.key = key;
    current.value = value;
    return value;
  }
}
