/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-bitwise: 'off' */
import md5 from './helpers/md5';

/**
 * Re-implementation of core/bloom-filter using a packed ArrayBuffer to hold
 * buckets. This prevents the need to copy buckets when the bloom filter is
 * created.
 */
export default class PackedBloomFilter {
  constructor(buff) {
    this.data = new DataView(buff);
    this.n = this.data.getUint32(0, false);
    this.k = this.data.getUint8(4, false);
    this.m = this.n * 32;

    const kbytes = 1 << Math.ceil(Math.log(Math.ceil(Math.log(this.m) / Math.LN2 / 8)) / Math.LN2);
    let Array;
    if (kbytes === 1) {
      Array = Uint8Array;
    } else if (kbytes === 2) {
      Array = Uint16Array;
    } else {
      Array = Uint32Array;
    }
    this._locations = new Array(this.k);
  }

  getBucket(i) {
    return this.data.getUint32(5 + (i * 4), false);
  }

  locations(a, b) {
    const ai = parseInt(a, 16);
    const bi = parseInt(b, 16);
    let x = ai % this.m;
    for (let i = 0; i < this.k; i += 1) {
      this._locations[i] = x < 0 ? (x + this.m) : x;
      x = (x + bi) % this.m;
    }
    return this._locations;
  }

  test(a, b) {
    const l = this.locations(a, b);
    for (let i = 0; i < this.k; i += 1) {
      const bk = l[i];
      if ((this.getBucket(Math.floor(bk / 32)) & (1 << (bk % 32))) === 0) {
        return false;
      }
    }
    return true;
  }

  testSingle(x) {
    const md5Hex = md5(x);
    const a = md5Hex.substring(0, 8);
    const b = md5Hex.substring(8, 16);
    return this.test(a, b);
  }

  add(a, b) {
    const l = this.locations(a, b);
    for (let i = 0; i < this.k; i += 1) {
      const bk = Math.floor(l[i] / 32);
      const offset = 5 + (bk * 4);
      const newValue = this.data.getUint32(offset, false) | (1 << (l[i] % 32));
      this.data.setUint32(offset, newValue, false);
    }
  }

  addSingle(x) {
    const md5Hex = md5(x);
    const a = md5Hex.substring(0, 8);
    const b = md5Hex.substring(8, 16);
    return this.add(a, b);
  }

  update(buff) {
    const diff = new PackedBloomFilter(buff);
    if (diff.n !== this.n && diff.k !== this.k) {
      throw new Error('Bloom filter can only be updated with same length');
    }
    for (let i = 0; i < this.n; i += 1) {
      const offset = 5 + (i * 4);
      this.data.setUint32(offset, this.data.getUint32(offset) | diff.getBucket(i), false);
    }
  }
}
