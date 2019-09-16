/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import PackedBloomFilter from '../core/bloom-filter-packed';
import { Resource } from '../core/resource-loader';
import { fetch, fetchArrayBuffer } from '../core/http';
import moment from '../platform/lib/moment';
import pacemaker from '../core/services/pacemaker';
import logger from './logger';

async function fetchPackedBloomFilter(url) {
  const response = await fetchArrayBuffer(url);
  if (!response.ok) {
    throw new Error(response.error);
  }
  const buffer = await response.arrayBuffer();
  return buffer;
}

export default class QSWhitelist2 {
  constructor(CDN_BASE_URL) {
    this.bloomFilter = null;
    this.CDN_BASE_URL = CDN_BASE_URL;
    this._bfLoader = new Resource(['antitracking', 'bloom_filter2.json'], {
      dataType: 'json',
      remoteOnly: true,
    });
    this._bfBinaryLoader = new Resource(['antitracking', 'bloom_filter2.bin'], {
      dataType: 'binary',
      remoteOnly: true,
    });
    this.localSafeKey = {};
  }

  async init() {
    try {
      const {
        version,
        localSafeKey,
      } = await this._bfLoader.load();
      const buffer = await this._bfBinaryLoader.load();
      this.bloomFilter = new PackedBloomFilter(buffer);
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
        // create empty bloom filter
        const n = 1000;
        const k = 10;
        const buffer = new ArrayBuffer(5 + (n * 4));
        const view = new DataView(buffer);
        view.setUint32(0, n, false);
        view.setUint8(4, k, false);
        this.bloomFilter = new PackedBloomFilter(buffer);
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
    this._updateChecker = pacemaker.everyHour(this._checkForUpdates.bind(this));
  }

  async _fetchUpdateURL() {
    const request = await fetch(`${this.CDN_BASE_URL}/update.json.gz`);
    if (!request.ok) {
      throw new Error(request.error);
    }
    return request.json();
  }

  async _fullUpdate(version) {
    const buffer = await fetchPackedBloomFilter(`${this.CDN_BASE_URL}/${version}/bloom_filter.gz`);
    this.bloomFilter = new PackedBloomFilter(buffer);
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
      const buffer = await fetchPackedBloomFilter(`${this.CDN_BASE_URL}/${version}/bf_diff_1.gz`);
      this.bloomFilter.update(buffer);
      this.version = version;
      await this._persistBloomFilter();
      return;
    }
    logger.debug(`[QSWhitelist2] Updating bloom filter to version ${version}`);
    await this._fullUpdate(version);
  }

  async _persistBloomFilter() {
    if (this.bloomFilter !== null) {
      await this._bfBinaryLoader.persist(this.bloomFilter.data.buffer);
      await this._bfLoader.persist(JSON.stringify({
        version: this.version,
        localSafeKey: this.localSafeKey,
      }));
    }
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
    pacemaker.clearTimeout(this._updateChecker);
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

  addSafeToken(tracker, token) {
    if (!this.isTrackerDomain(tracker)) {
      this.bloomFilter.addSingle(`d${tracker}`);
    }
    if (!this.shouldCheckDomainTokens(tracker)) {
      this.bloomFilter.addSingle(`c${tracker}`);
    }
    this.bloomFilter.addSingle(`t${token}`);
  }

  getVersion() {
    return {
      day: this.version,
    };
  }
}
