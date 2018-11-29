/* eslint no-bitwise: 'off' */
/* eslint import/prefer-default-export: 'off' */
/* eslint func-names: 'off' */

import md5 from '../core/helpers/md5';

const BITS_PER_BUCKET = 32;

// |elementsOrSize| is either an array with initial values (numbers), or a
// size for internal storage. You can calculate it, and |nHashes| using
// |calculateFilterProperties|.
export function BloomFilter(elementsOrSize, nHashes) {
  if (elementsOrSize.constructor.name === 'ArrayBuffer') {
    this._buckets = new Int32Array(elementsOrSize);
  } else {
    let size = 0;
    let elements = [];
    if (typeof elementsOrSize === 'number') {
      size = elementsOrSize;
    } else if (typeof elementsOrSize === 'object'
             && elementsOrSize.constructor.name === 'Array') {
      elements = elementsOrSize;
      size = elements.length;
    } else {
      throw new TypeError(
        'First argument must be either an integer, or array or ArrayBuffer'
      );
    }
    const buckets = new Int32Array(size);
    this._buckets = new Int32Array(size);
    // If |elementsOrSize| is an array we'll copy its elements:
    for (let i = 0; i < elements.length; i += 1) {
      buckets[i] = elements[i];
    }
  }

  this.m = this._buckets.length * BITS_PER_BUCKET;
  this.k = nHashes;
  this.nHashes = this.k; // TODO: make read-only
  this.rawData = this._buckets.buffer; // TODO: make read-only
}

BloomFilter.prototype.update = function (a) {
  let m = a.length * BITS_PER_BUCKET;
  const n = a.length;
  let i = -1;
  m = n * BITS_PER_BUCKET;
  if (this.m !== m) {
    throw new Error('Bloom filter can only be updated with same length');
  }
  while (i < n - 1) {
    i += 1;
    this._buckets[i] |= a[i];
  }
};

BloomFilter.prototype.test = function (x) {
  const [a, b] = this._a_b(x);
  return this._test(a, b);
};

BloomFilter.prototype.add = function (x) {
  const [a, b] = this._a_b(x);
  return this._add(a, b);
};

// Checks whether a value represented by its subhashes |a| and |b| is present in
// current filter set.
// |a| and |b| must be numbers.
BloomFilter.prototype._test = function (a, b) {
  const buckets = this._buckets;
  for (const bitIndex of this._bitIndexes(a, b)) {
    const bucketIndex = Math.floor(bitIndex / BITS_PER_BUCKET);
    const bucketBitIndex = 1 << (bitIndex % BITS_PER_BUCKET);
    if ((buckets[bucketIndex] & bucketBitIndex) === 0) {
      return false;
    }
  }
  return true;
};

// Puts a value represented by its subhashes |a| and |b| into filter set.
// |a| and |b| must be numbers.
BloomFilter.prototype._add = function (a, b) {
  const buckets = this._buckets;
  for (const bitIndex of this._bitIndexes(a, b)) {
    const bucketIndex = Math.floor(bitIndex / BITS_PER_BUCKET);
    const bucketBitIndex = 1 << (bitIndex % BITS_PER_BUCKET);
    buckets[bucketIndex] |= bucketBitIndex;
  }
};

BloomFilter.prototype._a_b = (x) => {
  const md5Hex = md5(x);
  const a = parseInt(md5Hex.substring(0, 8), 16);
  const b = parseInt(md5Hex.substring(8, 16), 16);
  return [a, b];
};

// For a pair of given subhashes of a value yields a series of bit indexes to
// read or write to.
// |a| and |b| must be numbers.
// eslint-disable-next-line func-names
BloomFilter.prototype._bitIndexes = function* (a, b) {
  const k = this.k;
  const m = this.m;
  let x = a % m;

  for (let i = 0; i < k; i += 1) {
    yield (x < 0 ? x + m : x);
    x = (x + b) % m;
  }
};
