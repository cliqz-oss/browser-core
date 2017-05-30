import md5 from "../core/helpers/md5";
/*
 * The module for bloom filter
 */

function toHexString(charCode) {
  return ("0" + charCode.toString(16)).slice(-2);
};

function fnv32a(v) {
  var FNV1_32A_INIT = 0x811c9dc5;
  var hval = FNV1_32A_INIT;
  for (var i = 0; i < v.length; ++i) {

  }
}

function BloomFilter(a, k) {  // a the array, k the number of hash function
  var m = a.length * 32,  // 32 bits for each element in a
      n = a.length,
      i = -1;
  this.m = m = n * 32;
  this.k = k;
  // choose data type
  var kbytes = 1 << Math.ceil(Math.log(Math.ceil(Math.log(m) / Math.LN2 / 8)) / Math.LN2),
      array = kbytes === 1 ? Uint8Array : kbytes === 2 ? Uint16Array : Uint32Array,
      kbuffer = new ArrayBuffer(kbytes * k),
      buckets = this.buckets = new Int32Array(n);
  while (++i < n) buckets[i] = a[i];  // put the elements into their bucket
  this._locations = new array(kbuffer);  // stores location for each hash function
}

BloomFilter.prototype.locations = function(a, b) {  // we use 2 hash values to generate k hash values
  var k = this.k,
      m = this.m,
      r = this._locations;
  a = parseInt(a, 16);
  b = parseInt(b, 16);
  var x = a % m;

  for (var i = 0; i < k; ++i) {
    r[i] = x < 0 ? (x + m) : x;
    x = (x + b) % m;
  }
  return r;
};

BloomFilter.prototype.test = function(a, b) {
  // since MD5 will be calculated before hand,
  // we allow using hash value as input to

  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) {
    var bk = l[i];
    if ((buckets[Math.floor(bk / 32)] & (1 << (bk % 32))) === 0) {
      return false;
    }
  }
  return true;
};

BloomFilter.prototype.testSingle = function(x) {
  // var a = CliqzBloomFilter.hash(x),
  //     b = CliqzBloomFilter.fnv32Hex(x);
  var md5 = CliqzBloomFilter.hash(x);
  var a = md5.substring(0, 8),
      b = md5.substring(8, 16);
  return this.test(a, b);
};

BloomFilter.prototype.add = function(a, b) {
  // Maybe used to add local safeKey to bloom filter
  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
};

BloomFilter.prototype.addSingle = function(x) {
  // var a = CliqzBloomFilter.hash(x),
  //     b = CliqzBloomFilter.fnv32Hex(x);
  var md5 = CliqzBloomFilter.hash(x);
  var a = md5.substring(0, 8),
      b = md5.substring(8, 16);
  return this.add(a, b);
};

BloomFilter.prototype.update = function(a) {
  // update the bloom filter, used in minor revison for every 10 min
  var m = a.length * 32,  // 32 bit for each element
      n = a.length,
      i = -1;
  m = n * 32;
  if (this.m != m)
    throw "Bloom filter can only be updated with same length";
  while (++i < n) this.buckets[i] |= a[i];
};

var CliqzBloomFilter = {
  VERSION: '0.1',
  debug: 'true',
  BLOOM_FILTER_CONFIG: 'https://cdn.cliqz.com/bloom_filter',
  hash: function(str, alg) {
    return md5(str);
  },
  fnv32a: function(str) {
    var FNV1_32A_INIT = 0x811c9dc5;
    var hval = FNV1_32A_INIT;
    for (var i = 0; i < str.length; ++i) {
      hval ^= str.charCodeAt(i);
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    return hval >>> 0;
  },
  fnv32Hex: function(str) {
    return CliqzBloomFilter.fnv32a(str).toString(16);
  },
  BloomFilter: BloomFilter
};

export default CliqzBloomFilter;
