import Promise from 'promise';
import md5 from 'antitracking/md5';
import * as datetime from 'antitracking/time';
import pacemaker from 'antitracking/pacemaker';
import QSWhitelistBase from 'antitracking/qs-whitelist-base';
import { utils } from 'core/cliqz';
import { Resource } from 'core/resource-loader';

export function BloomFilter(a, k) {  // a the array, k the number of hash function
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
  while (++i < n) {
    buckets[i] = a[i];  // put the elements into their bucket
  }
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
  var md5Hex = md5(x);
  var a = md5Hex.substring(0, 8),
      b = md5Hex.substring(8, 16);
  return this.test(a, b);
};

BloomFilter.prototype.add = function(a, b) {
  // Maybe used to add local safeKey to bloom filter
  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) {
    buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
  }
};

BloomFilter.prototype.addSingle = function(x) {
  var md5Hex = md5(x);
  var a = md5Hex.substring(0, 8),
      b = md5Hex.substring(8, 16);
  return this.add(a, b);
};

BloomFilter.prototype.update = function(a) {
  // update the bloom filter, used in minor revison for every 10 min
  var m = a.length * 32,  // 32 bit for each element
      n = a.length,
      i = -1;
  m = n * 32;
  if (this.m !== m) {
    throw 'Bloom filter can only be updated with same length';
  }
  while (++i < n) {
    this.buckets[i] |= a[i];
  }
};


var BLOOMFILTER_BASE_URL = 'https://cdn.cliqz.com/anti-tracking/bloom_filter/',
    BLOOMFILTER_CONFIG = 'https://cdn.cliqz.com/anti-tracking/bloom_filter/config';

const UPDATE_EXPIRY_HOURS = 48;

export class AttrackBloomFilter extends QSWhitelistBase {

  constructor(configURL = BLOOMFILTER_CONFIG, baseURL = BLOOMFILTER_BASE_URL) {
    super();
    this.lastUpdate = '0';
    this.bloomFilter = null;
    this.version = null;
    this.configURL = configURL;
    this.baseURL = baseURL;
    this._config = new Resource(['antitracking', 'bloom_config.json'], {
      remoteURL: configURL
    });
  }

  init() {
    // check every 10s
    pacemaker.register(this.update.bind(this), 10 * 60 * 1000);

    return Promise.all([
      super.init(),

      // try remote update before local
      this._config.updateFromRemote().catch(() => {
        return this._config.load();
      }).then(this.checkUpdate.bind(this))
        .then(() => {
          this.lastUpdate = datetime.getTime();
        }, (e) => {utils.log(e)})
    ]);
  }

  destroy() {
    super.destroy();
  }

  isUpToDate() {
    var delay = UPDATE_EXPIRY_HOURS,
        hour = datetime.newUTCDate();
    hour.setHours(hour.getHours() - delay);
    var hourCutoff = datetime.hourString(hour);
    return this.lastUpdate > hourCutoff;
  }

  isReady() {
    return this.bloomFilter !== null;
  }

  isTrackerDomain(domain) {
    return this.bloomFilter.testSingle('d' + domain);
  }

  isSafeKey(domain, key) {
    return (!this.isUnsafeKey(domain, key)) && (this.bloomFilter.testSingle('k' + domain + key) || super.isSafeKey(domain, key));
  }

  isSafeToken(domain, token) {
    return this.bloomFilter.testSingle('t' + domain + token);
  }

  isUnsafeKey(domain, token) {
    return this.bloomFilter.testSingle('u' + domain + token);
  }

  addDomain(domain) {
    this.bloomFilter.addSingle('d' + domain);
  }

  addSafeKey(domain, key, valueCount) {
    if (this.isUnsafeKey(domain, key)) {
      return;
    }
    this.bloomFilter.addSingle('k' + domain + key);
    super.addSafeKey(domain, key, valueCount);
  }

  addUnsafeKey(domain, token) {
    this.bloomFilter.addSingle('u' + domain + token);
  }

  addSafeToken(domain, token) {
    utils.log([domain, token]);
    if (token === '') {
      this.addDomain(domain);
    } else {
      this.bloomFilter.addSingle('t' + domain + token);
    }
  }

  getVersion() {
    return {
      bloomFilterversion: this.bloomFilter ? this.bloomFilter.version : null
    };
  }

  update() {
    this._config.updateFromRemote().then(this.checkUpdate.bind(this)).then(() => {
      this.lastUpdate = datetime.getTime();
    });
  }

  remoteUpdate(major, minor) {
    var url = this.baseURL + major + '/' + minor + '.gz',
        self = this;

    let updateFilter = function(bf) {
      if (minor !== 0) {
          self.bloomFilter.update(bf.bkt);
      } else {
          self.bloomFilter = new BloomFilter(bf.bkt, bf.k);
      }
      self.version.major = major;
      self.version.minor = minor;
      return Promise.resolve();
    };

    // load the filter, if possible from the CDN, otherwise grab a cached local version
    if (major === 'local') {
      return this.loadFromLocal().then(updateFilter);
    } else if (minor === 0) {
      const bloomFile = new Resource(['antitracking', 'bloom_filter.json'], {
        remoteURL: url
      });
      return bloomFile.updateFromRemote()
        .catch(() => this.loadFromLocal())
        .then(updateFilter);
    } else {
      return utils.promiseHttpHandler('GET', url, undefined, 10000)
        .then((req) => JSON.parse(req.response))
        .catch(() => this.loadFromLocal())
        .then(updateFilter);
    }
  }

  loadFromLocal() {
    const bloomFile = new Resource(['antitracking', 'bloom_filter.json']);
    return bloomFile.load()
  }

  checkUpdate(version) {
    if (version === undefined) {
      return Promise.reject('version undefined');
    }
    var self = this;
    if (self.version === null || self.bloomFilter === null) {  // load the first time
      self.version = {'major': null, 'minor': null};
      return self.remoteUpdate(version.major, 0); // load the major version and update later
    }
    if (self.version.major === version.major &&
      self.version.minor === version.minor) {  // already at the latest version
      return Promise.resolve();
    }
    if (self.version.major !== version.major) {
      return self.remoteUpdate(version.major, 0);
    } else {
      return self.remoteUpdate(version.major, version.minor);
    }
  }
}
