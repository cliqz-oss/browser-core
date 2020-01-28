/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../core/prefs';
import console from '../core/console';
import pacemaker from '../core/services/pacemaker';

const ONE_MINUTE = 60 * 1000;

const log = console.log.bind(console, 'freshtab.news-cache');

const STORAGE_PREFIX = 'modules.news.cache.';
const localStorage = {
  getItem(key) {
    return prefs.get(`${STORAGE_PREFIX}${key}`);
  },
  setItem(key, value) {
    prefs.set(`${STORAGE_PREFIX}${key}`, value);
  },
  removeItem(key) {
    prefs.clear(`${STORAGE_PREFIX}${key}`);
  },
};

export default class NewsCache {
  constructor(cacheName, updateInterval, updateFunction, updateAsynchronously) {
    this.cacheName = cacheName;
    this.timerName = `${cacheName}_timer`;
    this.updateInterval = updateInterval;
    this.updateFunction = updateFunction;

    // remove old versions of the caches
    if (localStorage.getItem('freshTab-data')) {
      localStorage.removeItem('freshTab-data');
    }
    if (localStorage.getItem('freshTab-news-cache')) {
      localStorage.removeItem('freshTab-news-cache');
    }

    this.cacheWasRetrieved = false;
    if (updateAsynchronously) {
      this.updateTimer = pacemaker.setTimeout(this.asynchronousUpdate.bind(this), 5 * 1000);
    }
  }

  reset() {
    localStorage.removeItem(this.cacheName);
    localStorage.removeItem(this.timerName);
  }

  asynchronousUpdate() {
    if (!this.cacheWasRetrieved) {
      this.updateTimer = pacemaker.setTimeout(this.asynchronousUpdate.bind(this), 5 * ONE_MINUTE);
    } else {
      this.cacheWasRetrieved = false;
      Promise.resolve(this.isStale())
        .then(isStale => (isStale ? this.updateCache() : Promise.resolve()))
        .then(() => {
          this.updateTimer = pacemaker.setTimeout(
            this.asynchronousUpdate.bind(this),
            Math.max(this.getTimeToNextUpdate(), 1000)
          );
        });
    }
  }

  getNextUpdateTime() {
    return parseInt(localStorage.getItem(this.timerName) || 0, 10)
      + this.updateInterval;
  }

  getTimeToNextUpdate() {
    return this.getNextUpdateTime() - Date.now();
  }

  updateLastUpdateTime() {
    localStorage.setItem(this.timerName, `${Date.now()}`);
  }

  putDataToCache(data) {
    log(`put data to cache ${this.cacheName}`);
    localStorage.setItem(this.cacheName, JSON.stringify(data));
    this.updateLastUpdateTime();
  }

  isStale() {
    if (prefs.get('freshTabByPassCache', false)) {
      log(`Bypass cache: ${this.cacheName}`);
      return true;
    }
    return this.getNextUpdateTime() < Date.now();
  }

  parseDataFromCache() {
    try {
      return JSON.parse(localStorage.getItem(this.cacheName) || '{}');
    } catch (err) {
      log(`Error parsing cache ${this.cacheName}`, err);
      return {};
    }
  }

  updateCache() {
    // only required for hbasedRecommendCacheObject
    return this.updateFunction(this.parseDataFromCache())
      .then(this.putDataToCache.bind(this))
      .catch(e => log('Error', e, `cache ${this.cacheName} is not updated.`));
  }

  getData() {
    this.cacheWasRetrieved = true;
    let updatePromise;
    if (this.isStale()) {
      updatePromise = this.updateCache();
    } else {
      updatePromise = Promise.resolve();
    }
    return updatePromise.then(() => this.parseDataFromCache());
  }
}
