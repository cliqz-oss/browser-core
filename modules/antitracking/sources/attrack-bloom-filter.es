import * as datetime from './time';
import pacemaker from '../core/services/pacemaker';
import QSWhitelistBase from './qs-whitelist-base';
import prefs from '../core/prefs';
import { Resource } from '../core/resource-loader';
import console from '../core/console';
import extConfig from '../core/config';
import BloomFilter from '../core/bloom-filter';

const BLOOMFILTER_BASE_URL = `${extConfig.settings.CDN_BASEURL}/anti-tracking/bloom_filter/`;
const BLOOMFILTER_CONFIG = `${extConfig.settings.CDN_BASEURL}/anti-tracking/bloom_filter/config`;
const BLOOMFILTER_VERSION_PREF = 'antitracking.bloomfilter.version';
const UPDATE_EXPIRY_HOURS = 48;

function getDayHypenated(day) {
  const dt = day || datetime.getTime();
  return `${dt.substr(0, 4)}-${dt.substr(4, 2)}-${dt.substr(6, 2)}`;
}

export default class AttrackBloomFilter extends QSWhitelistBase {
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

  shouldCheckDomainTokens(domain) {
    return this.isTrackerDomain(domain);
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
