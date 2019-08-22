/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-bitwise: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint func-names: 'off' */

import md5 from './helpers/md5';

export default function BloomFilter(a, k) { // a the array, k the number of hash function
  let m = a.length * 32; // 32 bits for each element in a
  const n = a.length;
  let i = -1;
  m = n * 32;
  this.m = m;
  this.k = k;
  // choose data type
  const kbytes = 1 << Math.ceil(Math.log(Math.ceil(Math.log(m) / Math.LN2 / 8)) / Math.LN2);

  let Array;
  if (kbytes === 1) {
    Array = Uint8Array;
  } else if (kbytes === 2) {
    Array = Uint16Array;
  } else {
    Array = Uint32Array;
  }

  const kbuffer = new ArrayBuffer(kbytes * k);
  this.buckets = new Int32Array(n);
  const buckets = this.buckets;
  while (i < n - 1) {
    i += 1;
    buckets[i] = a[i]; // put the elements into their bucket
  }
  this._locations = new Array(kbuffer); // stores location for each hash function
}

// we use 2 hash values to generate k hash values
BloomFilter.prototype.locations = function (a, b) {
  const k = this.k;
  const m = this.m;
  const r = this._locations;
  a = parseInt(a, 16);
  b = parseInt(b, 16);
  let x = a % m;

  for (let i = 0; i < k; i += 1) {
    r[i] = x < 0 ? (x + m) : x;
    x = (x + b) % m;
  }
  return r;
};

BloomFilter.prototype.test = function (a, b) {
  // since MD5 will be calculated before hand,
  // we allow using hash value as input to
  const l = this.locations(a, b);
  const k = this.k;
  const buckets = this.buckets;
  for (let i = 0; i < k; i += 1) {
    const bk = l[i];
    if ((buckets[Math.floor(bk / 32)] & (1 << (bk % 32))) === 0) {
      return false;
    }
  }
  return true;
};

BloomFilter.prototype.testSingle = function (x) {
  const md5Hex = md5(x);
  const a = md5Hex.substring(0, 8);
  const b = md5Hex.substring(8, 16);
  return this.test(a, b);
};

BloomFilter.prototype.add = function (a, b) {
  // Maybe used to add local safeKey to bloom filter
  const l = this.locations(a, b);
  const k = this.k;
  const buckets = this.buckets;
  for (let i = 0; i < k; i += 1) {
    buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
  }
};

BloomFilter.prototype.addSingle = function (x) {
  const md5Hex = md5(x);
  const a = md5Hex.substring(0, 8);
  const b = md5Hex.substring(8, 16);
  return this.add(a, b);
};

BloomFilter.prototype.update = function (a) {
  // update the bloom filter, used in minor revison for every 10 min
  let m = a.length * 32; // 32 bit for each element
  const n = a.length;
  let i = -1;
  m = n * 32;
  if (this.m !== m) {
    throw new Error('Bloom filter can only be updated with same length');
  }
  while (i < n - 1) {
    i += 1;
    this.buckets[i] |= a[i];
  }
};
