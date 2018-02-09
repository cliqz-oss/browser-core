import logger from '../common/offers_v2_logger';
import { timestampMS } from '../utils';
import MemoryHistoryHandler from './memory-history-handler';

// this time will specify how many seconds we want to wait till perform the next
// call on the history, In the future we will have a local history
const RE_QUERY_THRESHOLD_SECS = 60 * 30;

/**
 * Helper class to handle all the data associated to history
 * This class assumes that the feature is enabled
 */
export default class PatternHistoryMatching {

  /**
   * will get the history feature if enabled or null otherwise
   * also the matchOperation: (tokenizedURL, patternObj) -> true / false
   */
  constructor(historyFeature, matchOperation) {
    this.historyFeature = historyFeature;
    this.memoryHistory = new MemoryHistoryHandler(matchOperation);
    // cache of pattern id -> cache_entry data (check history-analyzer module)
    this.cache = new Map();
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
   */
  countMatches(query, patternObj) {
    if (!this._checkQuery(query) || !this._checkPatternObj(patternObj)) {
      logger.error('Invalid arguments: ', query, patternObj);
      return 0;
    }

    const now = timestampMS();
    const startQueryMS = now - (query.since_secs * 1000);
    const endQueryMS = now - (query.till_secs * 1000);
    let result = 0;

    // check if we only need memory history
    if (startQueryMS < this.memoryHistory.getStartedListeningTS()) {
      // we need real history
      result = this._countRealHistoryMatches(query, patternObj);
    }

    // check what we have to check from memory
    if (endQueryMS > this.memoryHistory.getStartedListeningTS()) {
      result += this._countMemoryHistoryMatches(startQueryMS, endQueryMS, patternObj);
    }

    return result;
  }

  trackTokenizedUrlOnMem(tokenizedURL) {
    this.memoryHistory.addTokenizedUrl(tokenizedURL);
  }

  // ///////////////////////////////////////////////////////////////////////////

  _countMemoryHistoryMatches(startQueryMS, endQueryMS, patternObj) {
    const cacheEntry = this._getOrCreateCacheEntry(patternObj);
    // we need to transform the query into memory query:
    const lastHistoryCache = cacheEntry.lastHistoryResultTS ?
                             cacheEntry.lastHistoryResultTS :
                             0;
    const memStartMS = Math.max(lastHistoryCache, startQueryMS);
    return this.memoryHistory.countMatches(memStartMS, endQueryMS, patternObj, patternObj.pid);
  }

  _countRealHistoryMatches(query, patternObj) {
    // check if we have the feature enabled
    if (this.historyFeature === null) {
      return 0;
    }

    // check if we have a cache data for it right now and return
    const cacheEntry = this._getOrCreateCacheEntry(patternObj);
    let result = 0;
    if (this._isCacheInvalid(cacheEntry, query)) {
      /* eslint no-param-reassign: off */
      logger.info(`invalidating cache for ${patternObj.pid}`);

      // invalidate the current cache
      this._invalidateCurrentCache(cacheEntry);
      // set the new values to it
      cacheEntry.lastQuery = { since_secs: query.since_secs, till_secs: query.till_secs };
      cacheEntry.lastQueryToHistoryTs = timestampMS();
      // perform the query
      this._performQueryOnHistory(query, cacheEntry.patterns, patternObj.pid);
    } else {
      result = cacheEntry.matchesCount;
    }

    return result;
  }

  _isCacheInvalid(cacheEntry, newQuery) {
    // we need to update the data if:
    // 1) the latest query differs from the current one
    // 2) we do not have any query nor data.
    // 3) the last time we perform a query is too old

    const areQueriesEq = (q1, q2) =>
      (q1 && q2) && q1.since_secs === q2.since_secs && q1.till_secs === q2.till_secs;
    return (cacheEntry.lastQuery === null ||
      !areQueriesEq(cacheEntry.lastQuery, newQuery)) ||
      ((timestampMS() - cacheEntry.lastQueryToHistoryTs) / 1000) > RE_QUERY_THRESHOLD_SECS;
  }

  _invalidateCurrentCache(cacheEntry) {
    cacheEntry.lastQuery = null;
    cacheEntry.matchesCount = 0;
    cacheEntry.last_checked_url_ts = 0;
  }

  _performQueryOnHistory(q, pList, pid) {
    // check history-analyzer for more info
    const now = timestampMS();
    const historyQuery = {
      patterns: pList,
      pid,
      start_ms: now - (q.since_secs * 1000),
      end_ms: now - (q.till_secs * 1000)
    };
    this.historyFeature.performQuery(historyQuery).then((data) => {
      if (!data || !data.d || !data.d.match_data || !data.d.match_data.total) {
        logger.error('invalid data received? ', data);
        return;
      }
      const cacheEntry = this.cache.get(pid);
      cacheEntry.matchesCount = data.d.match_data.total.m;
      cacheEntry.lastHistoryResultTS = data.d.match_data.total.last_checked_url_ts;
      logger.info(`updated entry for ${pid} = ${cacheEntry.matchesCount}`);
    });
  }

  _getOrCreateCacheEntry(patternObj) {
    if (this.cache.has(patternObj.pid)) {
      return this.cache.get(patternObj.pid);
    }
    const entry = {
      lastQueryToHistoryTs: 0,
      lastHistoryResultTS: 0,
      matchesCount: 0,
      lastQuery: null,
      patterns: patternObj.p_list,
    };
    this.cache.set(patternObj.pid, entry);
    return entry;
  }

  _checkPatternObj(po) {
    return (po !== undefined && po !== null) && po.pid &&
      (po.p_list && po.p_list.length > 0);
  }

  _checkQuery(q) {
    return q && (q.since_secs >= 0) && (q.till_secs >= 0) && (q.since_secs >= q.till_secs);
  }

}
