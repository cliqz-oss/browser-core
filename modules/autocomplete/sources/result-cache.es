/* eslint no-param-reassign: off */
import LRU from 'core/LRU';

export default class ResultCache {

  constructor() {
    this.clear();
  }

  getResult(query, getBackendResults) {
    const now = Date.now();
    const cachedResult = this.cache.get(query);
    if (cachedResult && cachedResult.expiresAt > now) {
      cachedResult.response.isClientCached = true;
      cachedResult.response.duration = 0;
      return Promise.resolve(cachedResult);
    }
    return getBackendResults(query).then((results) => {
      if (results.response && results.response.max_age) {
        results.expiresAt = Date.now() + (results.response.max_age * 1000);
        this.cache.set(query, results);
      }
      return results;
    });
  }

  clear() {
    // save up to 20 results
    this.cache = new LRU(20);
  }
}

