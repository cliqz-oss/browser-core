import logger from './common/offers_v2_logger';
import OffersConfigs from './offers_configs';
import PersistentCacheDB from './persistent_cache_db';
import { timestamp } from './utils';

const DB_DOC_NAME = 'trigger_history';
const DB_ENTRY_ID = 'history';
const MAX_HISTORY_RECORDS = OffersConfigs.TRIGGER_HISTORY_MAX_RECORDS;

export default class HistoryIndex {
  constructor(db) {
    this.cachedCounts = new Map();
    this.entries = [];
    this.load(db);
  }

  load(db) {
    const self = this;
    // we won't persist any trigger history if LOAD_TRIGGER_HISTORY_DATA is disabled
    const conf = {
      should_persist: OffersConfigs.LOAD_TRIGGER_HISTORY_DATA,
      autosave_freq_secs: OffersConfigs.TRIGGER_HISTORY_OP_AUTOSAVE_FREQ_SECS,
      old_entries_dt_secs: -1
    };

    self.triggerHistoryDB = new PersistentCacheDB(db, DB_DOC_NAME, conf);
    if (OffersConfigs.LOAD_TRIGGER_HISTORY_DATA) {
      self.triggerHistoryDB.loadEntries().then(() => {
        self.entries = self.triggerHistoryDB.getEntryData(DB_ENTRY_ID);
        if (!self.entries) {
          self.entries = [];
        }
        logger.info(`Loaded trigger history from local storage. Num entries: ${self.entries.length}`);
      });
    } else {
      self.entries = [];
      logger.info('Loading history disabled');
    }
    this._save();
  }

  _save() {
    this.triggerHistoryDB.setEntryData(DB_ENTRY_ID, this.entries);
    this.triggerHistoryDB.saveEntries();
  }

  queryHistory(start, end) {
    let result = [];
    const leftIdx = this._leftMostIndex(start);
    const rightIdx = this._rightMostIndex(end);
    if (!(leftIdx === -1 || rightIdx === -1 || leftIdx > rightIdx)) {
      result = this.entries.slice(leftIdx, rightIdx + 1);
    }

    return result;
  }

  /**
   * This method caches the counts for query matches for:
   * 1. given time interval
   * and
   * 2. given set of triggers (i.e. operation)
   * This is done in order to reduce the amount of pattern match invocations
   * and limit them only to the time deltas
   * @param {number} start : start time
   * @param {number} end : end time
   * @param {Object[]} regexList : list of regexes that should be matched
   * @param {number} id : id of the operation
   * @returns {number} count of matches for a given timestamp and a given operation
   */
  countHistoryEntries(start, end, regexList, id) {
    let entriesToProcess = [];
    const cache = this.cachedCounts.get(id);
    let iStartCache = -1;
    let iEndCache = -1;
    let counts = 0;
    if (cache) {
      iStartCache = this._leftMostIndex(cache.t_start);
      iEndCache = this._rightMostIndex(cache.t_end);
      counts = cache.count;
    }
    const leftIdx = this._leftMostIndex(start);
    const rightIdx = this._rightMostIndex(end);

    // fail fast on error of index retrieval
    if ((leftIdx === -1 || rightIdx === -1 || leftIdx > rightIdx)) {
      return 0;
    }

    // a set of flags that are used to define a cache intersection with a given range
    const notIntersected = iEndCache < leftIdx || rightIdx < iStartCache;
    const cacheIsEmbedded = leftIdx <= iStartCache && iEndCache <= rightIdx;
    const intervalIsEmbedded = iStartCache <= leftIdx && rightIdx <= iEndCache;
    const isCacheRequiredForIntersection = () => {
      const leftCount = iStartCache < leftIdx ? leftIdx - iStartCache : 0;
      const rightCount = rightIdx > iEndCache ? rightIdx - iEndCache : 0;
      return (iEndCache - leftIdx) > (leftCount + rightCount);
    };
    isCacheRequiredForIntersection();

    /**
     * Count a number of matches for a given set of triggers and a given set of History Entries
     * @param {[Object]} entriesForProcessing
     * @returns {number} number of matches
     */
    function countMatches(entriesForProcessing) {
      return entriesForProcessing
        .map(e => regexList.filter(r => r.test(e.url)))
        .reduce((all, arr) => ([...all, ...arr]), [])
        .length;
    }

    if (notIntersected) {
      counts = countMatches(this.entries.slice(leftIdx, rightIdx + 1));
    } else if (cacheIsEmbedded) {
      if (iStartCache - iEndCache > 0) {
        entriesToProcess = this.entries.slice(leftIdx, rightIdx + 1);
      } else if (iStartCache === leftIdx && iEndCache < rightIdx) {
        entriesToProcess = this.entries.slice(iEndCache + 1, rightIdx + 1);
      } else if (iEndCache === rightIdx && iStartCache > leftIdx) {
        entriesToProcess = this.entries.slice(leftIdx, iStartCache);
      } else if (iStartCache > leftIdx && iEndCache < rightIdx) {
        entriesToProcess = this.entries.slice(leftIdx, iStartCache)
          .concat(this.entries.slice(iEndCache + 1, rightIdx + 1));
      } else {
        entriesToProcess = [];
      }
      if (entriesToProcess.length !== 0) {
        counts += countMatches(entriesToProcess);
      }
    } else if (intervalIsEmbedded) {
      if (isCacheRequiredForIntersection) {
        if (iStartCache === leftIdx && iEndCache > rightIdx) {
          entriesToProcess = this.entries.slice(rightIdx + 1, iEndCache + 1);
        } else if (iEndCache === rightIdx && iStartCache < leftIdx) {
          entriesToProcess = this.entries.slice(iStartCache, leftIdx);
        } else {
          entriesToProcess = this.entries.slice(iStartCache, leftIdx)
            .concat(this.entries.slice(rightIdx + 1, iEndCache + 1));
        }
        counts -= countMatches(entriesToProcess);
      } else {
        entriesToProcess = this.entries.slice(leftIdx, rightIdx + 1);
        counts = countMatches(entriesToProcess);
      }
    } else {
      counts = countMatches(this.entries.slice(leftIdx, rightIdx + 1));
    }
    this.cachedCounts.set(id, { t_start: start, t_end: end, count: counts });
    return counts;
  }


  /**
   * perform binary search
   * return the index of the first element (from left to right) having ts >= leftBoundTS
   * @param leftBoundTS
   * @returns {number}
   * @private
   */
  _leftMostIndex(leftBoundTS) {
    const nEntries = this.entries.length;
    if (nEntries === 0) {
      return -1;
    }
    if (this.entries[nEntries - 1].ts < leftBoundTS) {
      return -1;
    }

    let low = 0;
    let high = nEntries - 1;
    while (low <= high) {
      const mid = Math.floor(low + ((high - low) / 2));
      if (this.entries[mid].ts >= leftBoundTS) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return high + 1;
  }

  /**
   * perform binary search
   * return the index of the last element (from left to right) having ts <= rightBoundTS
   * @param rightBoundTS
   * @returns {number}
   * @private
   */
  _rightMostIndex(rightBoundTS) {
    const nEntries = this.entries.length;
    if (nEntries === 0) {
      return -1;
    }
    if (this.entries[0].ts > rightBoundTS) {
      return -1;
    }

    let low = 0;
    let high = nEntries - 1;
    while (low <= high) {
      const mid = Math.floor(low + ((high - low) / 2));
      if (this.entries[mid].ts > rightBoundTS) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return low - 1;
  }

  addUrl(url, context) {
    /* eslint-disable no-param-reassign */

    if (context._urlAddedToHistory) {
      return;
    }
    context._urlAddedToHistory = true;

    logger.info(`URL added to history: ${url}`);

    this.entries.push({
      url,
      ts: timestamp()
    });
  }

  hasUrl(context) {
    return !!context._urlAddedToHistory;
  }

  savePersistentData() {
    if (OffersConfigs.LOAD_TRIGGER_HISTORY_DATA) {
      this.entries = this.entries.splice(-MAX_HISTORY_RECORDS);
      this._save();
    }
  }

  destroy() {
    this.triggerHistoryDB.destroy();
  }
}
