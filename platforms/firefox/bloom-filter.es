import md5 from 'core/helpers/md5';

const BITS_PER_BUCKET = 32;

// Returns a pair of numbers suitable for initialization of a |BloomFilter|
// instance: size of
// |nElements| is the expected number of stored elements.
// |falseRate| is the desired false positive test rate (0..1).
function calculateFilterProperties(nElements, falseRate) {
  let m = -1.0 * nElements * Math.log(falseRate) / Math.LN2 / Math.LN2;
  m = Math.floor(m * 1.1);
  let k = Math.floor(m / nElements * Math.LN2);
  return [Math.floor(m / BITS_PER_BUCKET), k];
}

// |elementsOrSize| is either an array with initial values (numbers), or a
// size for internal storage. You can calculate it, and |nHashes| using
// |calculateFilterProperties|.
export function BloomFilter(elementsOrSize, nHashes) {
  if (elementsOrSize.constructor.name === 'ArrayBuffer') {
    this._buckets = new Int32Array(elementsOrSize);
  }
  else {
    let size = 0;
    let elements = [];
    if (typeof elementsOrSize === 'number') {
      size = elementsOrSize;
    }
    else if (typeof elementsOrSize === 'object' &&
             elementsOrSize.constructor.name === 'Array') {
      elements = elementsOrSize;
      size = elements.length;
    }
    else {
      throw new TypeError(
          'First argument must be either an integer, or array or ArrayBuffer');
    }
    let buckets = this._buckets = new Int32Array(size);
    // If |elementsOrSize| is an array we'll copy its elements:
    for (let i = 0; i < elements.length; i++) {
      buckets[i] = elements[i];
    }
  }

  this.m = this._buckets.length * BITS_PER_BUCKET;
  this.k = this.nHashes = nHashes;  // TODO: make read-only
  this.rawData = this._buckets.buffer;  // TODO: make read-only
}

BloomFilter.prototype.update = function(a) {
  var m = a.length * BITS_PER_BUCKET,
      n = a.length,
      i = -1;
  m = n * BITS_PER_BUCKET;
  if (this.m !== m) {
    throw new Error('Bloom filter can only be updated with same length');
  }
  while (++i < n) {
    this._buckets[i] |= a[i];
  }
};

BloomFilter.prototype.test = function(x) {
  const [a, b] = this._a_b(x);
  return this._test(a, b);
};

BloomFilter.prototype.add = function(x) {
  const [a, b] = this._a_b(x);
  return this._add(a, b);
};

// Checks whether a value represented by its subhashes |a| and |b| is present in
// current filter set.
// |a| and |b| must be numbers.
BloomFilter.prototype._test = function(a, b) {
  const buckets = this._buckets;
  for (let bitIndex of this._bitIndexes(a, b)) {
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
BloomFilter.prototype._add = function(a, b) {
  const buckets = this._buckets;
  for (let bitIndex of this._bitIndexes(a, b)) {
    const bucketIndex = Math.floor(bitIndex / BITS_PER_BUCKET);
    const bucketBitIndex = 1 << (bitIndex % BITS_PER_BUCKET);
    buckets[bucketIndex] |= bucketBitIndex;
  }
};

BloomFilter.prototype._a_b = function(x) {
  const md5Hex = md5(x);
  const a = parseInt(md5Hex.substring(0, 8), 16);
  const b = parseInt(md5Hex.substring(8, 16), 16);
  return [a, b];
}

// For a pair of given subhashes of a value yields a series of bit indexes to
// read or write to.
// |a| and |b| must be numbers.
BloomFilter.prototype._bitIndexes = function*(a, b) {
  const k = this.k;
  const m = this.m;
  let x = a % m;

  for (let i = 0; i < k; ++i) {
    yield (x < 0 ? x + m : x);
    x = (x + b) % m;
  }
};
