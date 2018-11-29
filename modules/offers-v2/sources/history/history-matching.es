import logger from '../common/offers_v2_logger';
import { timestampMS } from '../utils';

// this time will specify how many seconds we want to wait till perform the next
// call on the history, In the future we will have a local history
const RE_QUERY_THRESHOLD_SECS = 60 * 30;

/**
 * Helper class to handle all the data associated to history
 * This class assumes that the feature is enabled
 */
export default class HistoryMatcher {
  /**
   * will get the history feature if enabled or null otherwise
   */
  constructor(historyFeature) {
    this.historyFeature = historyFeature;
    // cache of pattern id -> cache_entry data (check history-analyzer module)
    this.cache = new Map();
  }

  hasHistoryEnabled() {
    return !!this.historyFeature;
  }

  /**
   * Will count how many matches do we have on the history (on the given time range
   * in the query).
   * This method will for now query the history module every N seconds only.
   *
   * Query:
   * {
   *   since_secs: X
   *   till_secs: Y
   * }
   * we will check the history in [now - since_secs,  now - till_secs] window
   *
   * @return object containing:
   *         - isPartial (flag indicating if it is partial data or not)
   *         - count: the number of matches we found (partial or fully)
   *         on error => count < 0
   */
  countMatchesWithPartialCheck(query, patternObj, patternIndex) {
    if (!this._checkQuery(query) || !this._checkPatternObj(patternObj) || !patternIndex) {
      logger.error('Invalid arguments: ', query, patternObj);
      return { isPartial: false, count: -1 };
    }

    // check if we have a cache for this entry
    const cacheEntry = this._getCacheEntry(query, patternObj.pid);
    if (cacheEntry) {
      return cacheEntry;
    }

    // we generate a new cache entry
    const newCacheEntry = {
      // last time we performed the query to the history
      lastQueryToHistoryTs: timestampMS(),
      // if the result is partial, by default yes
      isPartial: true,
      // the number of matches we have.
      count: 0,
      // store the query for later checks
      query: JSON.parse(JSON.stringify(query)),
    };
    this.cache.set(patternObj.pid, newCacheEntry);

    this._performQueryOnHistory(query, patternObj, patternIndex);

    return newCacheEntry;
  }

  /**
   * This is the promise version
   * Returns a version with the number of matches
   */
  countMatches(query, patternObj, patternIndex) {
    if (!this._checkQuery(query) || !this._checkPatternObj(patternObj) || !patternIndex) {
      logger.error('Invalid arguments: ', query, patternObj);
      return Promise.resolve(-1);
    }

    // check if we have a cache for this entry
    const cacheEntry = this._getCacheEntry(query, patternObj.pid);
    if (cacheEntry) {
      if (cacheEntry.promise) {
        return cacheEntry.promise;
      }
      // we have already the data
      return Promise.resolve(cacheEntry.count);
    }

    // we generate a new cache entry
    const newCacheEntry = {
      // last time we performed the query to the history
      lastQueryToHistoryTs: timestampMS(),
      // if the result is partial, by default yes
      isPartial: true,
      // the number of matches we have.
      count: 0,
      // store the query for later checks
      query: JSON.parse(JSON.stringify(query)),
    };
    this.cache.set(patternObj.pid, newCacheEntry);

    return this._performQueryOnHistory(query, patternObj, patternIndex);
  }

  // ///////////////////////////////////////////////////////////////////////////


  _getCacheEntry(query, pid) {
    const areQueriesEq = (q1, q2) =>
      (q1 && q2) && q1.since_secs === q2.since_secs && q1.till_secs === q2.till_secs;

    const cacheEntry = this.cache.get(pid);
    if (!cacheEntry) {
      return null;
    }

    // check query is same
    if (!areQueriesEq(query, cacheEntry.query)) {
      this.cache.delete(pid);
      return null;
    }

    // check if it is valid
    const lastQuerySecs = (timestampMS() - cacheEntry.lastQueryToHistoryTs) / 1000;
    if (lastQuerySecs > RE_QUERY_THRESHOLD_SECS) {
      // invalidate the cache
      this.cache.delete(pid);
      return null;
    }
    // still valid
    return cacheEntry;
  }

  _performQueryOnHistory(query, patternObj, patternIndex) {
    if (!this.historyFeature) {
      // we cannot check here the history data so we do not anything.
      return Promise.resolve(-1);
    }

    const now = timestampMS();
    const historyQuery = {
      index: patternIndex,
      start_ms: now - (query.since_secs * 1000),
      end_ms: now - (query.till_secs * 1000),
      pid: patternObj.pid,
    };
    let cacheEntry = this.cache.get(patternObj.pid);

    cacheEntry.promise = this.historyFeature.performQuery(historyQuery).then((data) => {
      if (!data || !data.d || !data.d.match_data || !data.d.match_data.total) {
        logger.error('invalid data received? ', data);
        return;
      }
      // we got the result, we mark is as not partial anymore and set the result
      cacheEntry = this.cache.get(patternObj.pid);
      cacheEntry.count = data.d.match_data.total.m;
      cacheEntry.isPartial = false;
      // remove the promise associated to this one
      cacheEntry.promise = null;
      logger.info(`updated entry for ${patternObj.pid} = ${cacheEntry.count}`);
      Promise.resolve(cacheEntry.count);
    });

    return cacheEntry.promise;
  }

  _checkPatternObj(po) {
    return (po !== undefined && po !== null) && po.pid
      && (po.p_list && po.p_list.length > 0);
  }

  _checkQuery(q) {
    return q && (q.since_secs >= 0) && (q.till_secs >= 0) && (q.since_secs >= q.till_secs);
  }
}
