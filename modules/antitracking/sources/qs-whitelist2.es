import BloomFilter from '../core/bloom-filter';
import { Resource } from '../core/resource-loader';
import { fetch } from '../core/http';
import moment from '../platform/lib/moment';
import setInterval from '../core/helpers/timeout';
import logger from './logger';

async function fetchPackedBloomFilter(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.error);
  }
  const buffer = await response.arrayBuffer();
  const data = new DataView(buffer);
  const n = data.getUint32(0, false);
  const k = data.getUint8(4, false);
  const buckets = [];
  for (let i = 0; i < n; i += 1) {
    buckets.push(data.getUint32(5 + (i * 4), false));
  }
  return {
    n,
    k,
    bkt: buckets,
  };
}

export default class QSWhitelist2 {
  constructor(CDN_BASE_URL) {
    this.bloomFilter = null;
    this.CDN_BASE_URL = CDN_BASE_URL;
    this._bfLoader = new Resource(['antitracking', 'bloom_filter2.json'], {
      dataType: 'json',
    });
    this.localSafeKey = {};
  }

  async init() {
    try {
      const {
        version,
        bkt,
        k,
        localSafeKey,
      } = await this._bfLoader.load();
      this.bloomFilter = new BloomFilter(bkt, k);
      this.version = version;
      this.localSafeKey = localSafeKey || {};
      logger.debug(`[QSWhitelist2] Bloom filter loaded version ${version}`);
    } catch (e) {
      logger.info('[QSWhitelist2] Failed loading filter from local');
    }
    if (this.bloomFilter === null) {
      // local bloom filter loading wasn't successful, grab a new version
      try {
        const update = await this._fetchUpdateURL();
        await this._fullUpdate(update.version);
      } catch (e) {
        logger.error('[QSWhitelist2] Error fetching bloom filter from remote', e);
      }
    } else {
      // we loaded the bloom filter, check for updates
      try {
        await this._checkForUpdates();
      } catch (e) {
        logger.error('[QSWhitelist2] Error fetching bloom filter updates from remote', e);
      }
    }
    // check for updates once per hour
    this._updateChecker = setInterval(this._checkForUpdates.bind(this), 360000);
  }

  async _fetchUpdateURL() {
    const request = await fetch(`${this.CDN_BASE_URL}/update.json.gz`);
    if (!request.ok) {
      throw new Error(request.error);
    }
    return request.json();
  }

  async _fullUpdate(version) {
    const { k, bkt } = await fetchPackedBloomFilter(`${this.CDN_BASE_URL}/${version}/bloom_filter.gz`);
    this.bloomFilter = new BloomFilter(bkt, k);
    this.version = version;
    logger.debug(`[QSWhitelist2] Bloom filter fetched version ${version}`);
    await this._persistBloomFilter();
  }

  async _checkForUpdates() {
    const { version, useDiff } = await this._fetchUpdateURL();
    if (version === this.version) {
      logger.debug('[QSWhitelist2] Bloom filter is up-to-date');
      return; // already up to date!
    }
    this._cleanLocalSafekey();
    if (useDiff === true && moment(this.version).diff(version, 'days') === -1) {
      logger.debug(`[QSWhitelist2] Updating bloom filter to version ${version} from diff file`);
      // diff update is allowed and our version is one day behind the server
      const { bkt } = await fetchPackedBloomFilter(`${this.CDN_BASE_URL}/${version}/bf_diff_1.gz`);
      this.bloomFilter.update(bkt);
      this.version = version;
      await this._persistBloomFilter();
      return;
    }
    logger.debug(`[QSWhitelist2] Updating bloom filter to version ${version}`);
    await this._fullUpdate(version);
  }

  _persistBloomFilter() {
    if (this.bloomFilter !== null) {
      return this._bfLoader.persist(JSON.stringify({
        version: this.version,
        k: this.bloomFilter.k,
        bkt: [...this.bloomFilter.buckets],
        localSafeKey: this.localSafeKey,
      }));
    }
    return Promise.resolve();
  }

  _cleanLocalSafekey() {
    const cutoff = moment().subtract(7, 'days').valueOf();
    Object.keys(this.localSafeKey).forEach((domain) => {
      Object.keys(this.localSafeKey[domain]).forEach((key) => {
        if (this.localSafeKey[domain][key] < cutoff) {
          delete this.localSafeKey[domain][key];
        }
      });
      if (Object.keys(this.localSafeKey[domain]).length === 0) {
        delete this.localSafeKey[domain];
      }
    });
  }

  async destroy() {
    if (this._updateChecker) {
      this._updateChecker.stop();
    }
    await this._persistBloomFilter();
  }

  isUpToDate() {
    return this.isReady();
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

  shouldCheckDomainTokens(domain) {
    if (!this.isReady()) {
      return false;
    }
    return this.bloomFilter.testSingle(`c${domain}`);
  }

  isSafeKey(domain, key) {
    if (!this.isReady()) {
      return true;
    }
    if (this.bloomFilter.testSingle(`k${domain}${key}`)) {
      return true;
    }
    if (this.localSafeKey[domain] && this.localSafeKey[domain][key]) {
      return true;
    }
    return false;
  }

  isSafeToken(domain, token) {
    if (!this.isReady()) {
      return true;
    }
    return this.bloomFilter.testSingle(`t${token}`);
  }

  isUnsafeKey() {
    return false;
  }

  addSafeKey(domain, key) {
    if (!this.localSafeKey[domain]) {
      this.localSafeKey[domain] = {};
    }
    this.localSafeKey[domain][key] = moment().valueOf();
  }

  getVersion() {
    return this.version;
  }
}
