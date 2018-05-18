/* eslint no-bitwise: 'off' */
/* eslint func-names: 'off' */
/* eslint no-param-reassign: 'off' */

import md5 from '../core/helpers/md5';
import config from '../core/config';

/*
 * The module for bloom filter
 */

function BloomFilter(a, k) { // a the array, k the number of hash function
  let m = a.length * 32; // 32 bits for each element in a
  const n = a.length;
  let i = 0;
  this.m = n * 32;
  m = this.m;
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
  const buckets = new Int32Array(n);
  this.buckets = buckets;
  while (i < n - 1) {
    i += 1;
    buckets[i] = a[i]; // put the elements into their bucket
  }
  this._locations = new Array(kbuffer); // stores location for each hash function
}

const CliqzBloomFilter = {
  VERSION: '0.1',
  debug: 'true',
  BLOOM_FILTER_CONFIG: `${config.settings.CDN_BASEURL}/bloom_filter`,
  hash(str) {
    return md5(str);
  },
  fnv32a(str) {
    const FNV1_32A_INIT = 0x811c9dc5;
    let hval = FNV1_32A_INIT;
    for (let i = 0; i < str.length; i += 1) {
      hval ^= str.charCodeAt(i);
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    return hval >>> 0;
  },
  fnv32Hex(str) {
    return CliqzBloomFilter.fnv32a(str).toString(16);
  },
  BloomFilter
};

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
  // var a = CliqzBloomFilter.hash(x),
  //     b = CliqzBloomFilter.fnv32Hex(x);
  const md5Hash = CliqzBloomFilter.hash(x);
  const a = md5Hash.substring(0, 8);
  const b = md5Hash.substring(8, 16);
  return this.test(a, b);
};

BloomFilter.prototype.add = function (a, b) {
  // Maybe used to add local safeKey to bloom filter
  const l = this.locations(a, b);
  const k = this.k;
  const buckets = this.buckets;
  for (let i = 0; i < k; i += 1) buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
};

BloomFilter.prototype.addSingle = function (x) {
  // var a = CliqzBloomFilter.hash(x),
  //     b = CliqzBloomFilter.fnv32Hex(x);
  const md5Hash = CliqzBloomFilter.hash(x);
  const a = md5Hash.substring(0, 8);
  const b = md5Hash.substring(8, 16);
  return this.add(a, b);
};

BloomFilter.prototype.update = function (a) {
  // update the bloom filter, used in minor revison for every 10 min
  let m = a.length * 32; // 32 bit for each element
  const n = a.length;
  let i = 0;
  m = n * 32;
  if (this.m !== m) {
    throw new Error('Bloom filter can only be updated with same length');
  }
  while (i < n - 1) {
    i += 1;
    this.buckets[i] |= a[i];
  }
};

export default CliqzBloomFilter;
