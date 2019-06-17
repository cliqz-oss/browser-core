import prefs from '../core/prefs';
import console from '../core/console';
import Storage from '../core/storage';
import pacemaker from '../core/services/pacemaker';

import config from './config';

const ONE_MINUTE = 60 * 1000;

const log = console.log.bind(console, 'freshtab.news-cache');

export default class NewsCache {
  constructor(cacheName, updateInterval, updateFunction, updateAsynchronously) {
    this.cacheName = cacheName;
    this.timerName = `${cacheName}_timer`;
    this.updateInterval = updateInterval;
    this.localStore = new Storage(config.settings.NEW_TAB_URL);
    this.updateFunction = updateFunction;

    // remove old versions of the caches
    if (this.localStore.getItem('freshTab-data')) {
      this.localStore.removeItem('freshTab-data');
    }
    if (this.localStore.getItem('freshTab-news-cache')) {
      this.localStore.removeItem('freshTab-news-cache');
    }

    this.cacheWasRetrieved = false;
    if (updateAsynchronously) {
      this.updateTimer = pacemaker.setTimeout(this.asynchronousUpdate.bind(this), 5 * 1000);
    }
  }

  reset() {
    this.localStore.removeItem(this.cacheName);
    this.localStore.removeItem(this.timerName);
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
    return parseInt(this.localStore.getItem(this.timerName) || 0, 10) + this.updateInterval;
  }

  getTimeToNextUpdate() {
    return this.getNextUpdateTime() - Date.now();
  }

  updateLastUpdateTime() {
    this.localStore.setItem(this.timerName, `${Date.now()}`);
  }

  putDataToCache(data) {
    log(`put data to cache ${this.cacheName}`);
    this.localStore.setItem(this.cacheName, JSON.stringify(data));
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
      return JSON.parse(this.localStore.getItem(this.cacheName) || '{}');
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
