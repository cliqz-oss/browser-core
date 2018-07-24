/* eslint no-bitwise: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint func-names: 'off' */

import md5 from '../core/helpers/md5';
import * as datetime from './time';
import pacemaker from '../core/pacemaker';
import QSWhitelistBase from './qs-whitelist-base';
import prefs from '../core/prefs';
import { Resource } from '../core/resource-loader';
import console from '../core/console';
import extConfig from '../core/config';


export function BloomFilter(a, k) { // a the array, k the number of hash function
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


const BLOOMFILTER_BASE_URL = `${extConfig.settings.CDN_BASEURL}/anti-tracking/bloom_filter/`;
const BLOOMFILTER_CONFIG = `${extConfig.settings.CDN_BASEURL}/anti-tracking/bloom_filter/config`;
const BLOOMFILTER_VERSION_PREF = 'antitracking.bloomfilter.version';
const UPDATE_EXPIRY_HOURS = 48;

function getDayHypenated(day) {
  const dt = day || datetime.getTime();
  return `${dt.substr(0, 4)}-${dt.substr(4, 2)}-${dt.substr(6, 2)}`;
}

export class AttrackBloomFilter extends QSWhitelistBase {
  constructor(config, configURL = BLOOMFILTER_CONFIG, baseURL = BLOOMFILTER_BASE_URL) {
    super(config);
    this.bloomFilter = null;
    this.version = {
      major: '0000-00-00',
      minor: 0,
    };
    this.configURL = configURL;
    this.baseURL = baseURL;
    this._config = new Resource(['antitracking', 'bloom_config.json'], {
      remoteURL: configURL
    });
  }

  init() {
    // check every 60min
    this._updateTask = pacemaker.register(this.update.bind(this), 60 * 60 * 1000);
    const initPromises = [];
    initPromises.push(super.init());
    // if we already have a bloomFilter, leave the update to this.update
    if (!this.bloomFilter) {
      // load from file
      const bfLoading = this.loadFromFile();
      initPromises.push(bfLoading);
      // if the cached file is out of date, or non existed, trigger an update
      bfLoading.then(() => {
        if (!this.isUpToDate()) {
          this.update();
        }
      });
    }

    return Promise.all(initPromises);
  }

  destroy() {
    super.destroy();
    if (this._updateTask) {
      pacemaker.deregister(this._updateTask);
    }
  }

  loadFromFile() {
    const bloomFile = new Resource(['antitracking', 'bloom_filter.json'], {
      remoteOnly: true // ignore chrome url
    });
    return bloomFile.load().then(bf => ({
      bf,
      major: prefs.get(BLOOMFILTER_VERSION_PREF, '0000-00-00'),
      minor: 0,
    }))
      .then(({ bf, major, minor }) => this.updateFilter(bf, major, minor))
      .catch(() => console.log('bloom filter', 'load from file failed'));
  }

  update() {
    const dt = getDayHypenated();
    if (this.version.major < dt) {
      return this._getFilterForDay(dt) // fast update (guessing the url)
        .catch(() => this._config.updateFromRemote() // fast failed, pull the config too
          .then(conf => this._getFilterForDay(conf.major))
        )
        // process the fetched file, or suppress the error if we weren't able to fetch
        .then(
          ({ bf, major, minor }) => this.updateFilter(bf, major, minor)
        )
        .catch(err => console.log('bloom filter', 'update failed', err));
    }
    return Promise.resolve();
  }

  _getFilterForDay(day) {
    const minor = 0;
    const bloomFile = new Resource(['antitracking', 'bloom_filter.json'], {
      remoteOnly: true,
      remoteURL: `${this.baseURL}${day}/${minor}.gz`,
    });
    return bloomFile.updateFromRemote().then(bf => ({
      bf,
      major: day,
      minor,
    }));
  }

  updateFilter(bf, major, minor) {
    if (minor !== 0) {
      this.bloomFilter.update(bf.bkt);
    } else {
      this.bloomFilter = new BloomFilter(bf.bkt, bf.k);
    }
    this.version = {
      major,
      minor
    };
    prefs.set(BLOOMFILTER_VERSION_PREF, this.version.major);
    return Promise.resolve();
  }

  isUpToDate() {
    const delay = UPDATE_EXPIRY_HOURS;
    const hour = datetime.newUTCDate();
    hour.setHours(hour.getHours() - delay);
    const cutoff = hour.toISOString().substring(0, 10);
    return this.version.major > cutoff;
  }

  isReady() {
    return this.bloomFilter !== null;
  }

  isTrackerDomain(domain) {
    if (!this.isReady()) {
      return false;
    }
    return this.bloomFilter.testSingle(`d${domain}`);
  }

  isSafeKey(domain, key) {
    if (!this.isReady()) {
      return true;
    }
    return (!this.isUnsafeKey(domain, key)) && (this.bloomFilter.testSingle(`k${domain}${key}`) || super.isSafeKey(domain, key));
  }

  isSafeToken(domain, token) {
    if (!this.isReady()) {
      return true;
    }
    return this.bloomFilter.testSingle(`t${domain}${token}`);
  }

  isUnsafeKey(domain, token) {
    if (!this.isReady()) {
      return false;
    }
    return this.bloomFilter.testSingle(`u${domain}${token}`);
  }

  addDomain(domain) {
    if (!this.isReady()) {
      return;
    }
    this.bloomFilter.addSingle(`d${domain}`);
  }

  addSafeKey(domain, key, valueCount) {
    if (!this.isReady()) {
      return;
    }
    if (this.isUnsafeKey(domain, key)) {
      return;
    }
    this.bloomFilter.addSingle(`k${domain}${key}`);
    super.addSafeKey(domain, key, valueCount);
  }

  addUnsafeKey(domain, token) {
    if (!this.isReady()) {
      return;
    }
    this.bloomFilter.addSingle(`u${domain}${token}`);
  }

  addSafeToken(domain, token) {
    if (!this.isReady()) {
      return;
    }
    if (token === '') {
      this.addDomain(domain);
    } else {
      this.bloomFilter.addSingle(`t${domain}${token}`);
    }
  }

  getVersion() {
    let bloomFilterversion = null;
    if (this.bloomFilter && this.bloomFilter.version !== null &&
        this.bloomFilter.version !== undefined) {
      bloomFilterversion = this.bloomFilter.version;
    }
    return { bloomFilterversion };
  }
}
