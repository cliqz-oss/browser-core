import { timestampMS } from '../utils';
import logger from '../common/offers_v2_logger';

const MAX_NUM_URLS_ON_MEM = 500;

/**
 * perform binary search
 * return the index of the first element (from left to right) having ts >= leftBoundTS
 * @param leftBoundTS
 * @returns {number}
 * @private
 */
const leftMostIndex = (entries, leftBoundTS) => {
  const nEntries = entries.length;
  if (nEntries === 0 || entries[nEntries - 1].ts < leftBoundTS) {
    return -1;
  }

  let low = 0;
  let high = nEntries - 1;
  while (low <= high) {
    const mid = Math.floor(low + ((high - low) / 2));
    if (entries[mid].ts >= leftBoundTS) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return high + 1;
};

/**
 * perform binary search
 * return the index of the last element (from left to right) having ts <= rightBoundTS
 * @param rightBoundTS
 * @returns {number}
 * @private
 */
const rightMostIndex = (entries, rightBoundTS) => {
  const nEntries = entries.length;
  if (nEntries === 0 || entries[0].ts > rightBoundTS) {
    return -1;
  }

  let low = 0;
  let high = nEntries - 1;
  while (low <= high) {
    const mid = Math.floor(low + ((high - low) / 2));
    if (entries[mid].ts > rightBoundTS) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return low - 1;
};


/**
 * Helper handy class to simplify intervals handling
 */
class Interval {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  overlaps(otherInterval) {
    // overlaps if not not overlaps :)
    return !((this.end <= otherInterval.start) || (otherInterval.end <= this.start));
  }

  len() {
    return this.end - this.start;
  }

  /**
   * returns if the current interval is contained in the otherInterval (meaning the otherInterval is
   * bigger than the current one and the current one is inside)
   * @param  {[type]}  otherInterval [description]
   * @return {Boolean}       [description]
   */
  isInside(otherInterval) {
    return otherInterval && otherInterval.start <= this.start && otherInterval.end >= this.end;
  }

  isPointInside(p) {
    return this.start <= p && p <= this.end;
  }

  eql(otherInterval) {
    return otherInterval &&
           this.start === otherInterval.start &&
           this.end === otherInterval.end;
  }

  /**
   * will return all the intervals that results from overlapping intervals
   * This method will return all the non-overlaping possible intervals from all
   * the intersections of the current and otherInterval interval
   * @param  {[type]} otherInterval [description]
   * @return {[type]}       [description]
   */
  splitOverlaps(otherInterval) {
    if (!this.overlaps(otherInterval)) {
      return [];
    }
    const positions = [...new Set([this.start,
      this.end,
      otherInterval.start,
      otherInterval.end])].sort();
    const result = [];
    for (let i = 1; i < positions.length; i += 1) {
      result.push(new Interval(positions[i - 1], positions[i]));
    }
    return result;
  }

}

/**
 * This class will handle the urls that the user visited since the browser started
 * so we can perform fast history checks for short period of times
 */
export default class MemoryHistoryHandler {
  /**
   * the matchMethod is required to compare (patternObject, url). will return
   * true if there is a match or false otherwise
   */
  constructor(matchMethod) {
    this.matchMethod = matchMethod;
    this.entries = [];
    // we will hold: pid -> {startMS, endMS, count}
    this.cache = new Map();
    this.startedListeningTS = timestampMS();
  }

  getStartedListeningTS() {
    return this.startedListeningTS;
  }

  /**
   * add a tokenized url in the list assuming the current timestamp
   */
  addTokenizedUrl(tokenizedUrl) {
    this.entries.push({ urlData: tokenizedUrl, ts: timestampMS() });

    // make the entries fixed size
    if (this.entries.length > MAX_NUM_URLS_ON_MEM) {
      this.entries.splice(0, 10);
      this.startedListeningTS = this.entries[0].ts;
    }
  }

  /**
   * will check if a pattern index (uniquely identify with the pid) matches
   * the given range on the memory history.
   * Returns the number of matches on memory history.
   */
  countMatches(startMS, endMS, pObj, pid) {
    const queryInterval = new Interval(leftMostIndex(this.entries, startMS),
                                      rightMostIndex(this.entries, endMS));

    if (queryInterval.start < 0 || queryInterval.end < 0) {
      logger.error('Something went wrong here', queryInterval);
      return 0;
    }

    // if we already have the query in the cache we return
    const cache = this.cache.get(pid);
    let cacheInterval = null;
    if (cache) {
      cacheInterval = new Interval(leftMostIndex(this.entries, cache.startMS),
                                   rightMostIndex(this.entries, cache.endMS));
    }
    if (queryInterval.eql(cacheInterval)) {
      return cache.count;
    }

    // We will split the code as follow:
    // 0 / 1) non overlaps (no cache or they do not overlap at all)
    // 2) they overlap:
    //  - one inside of the other (x2)
    //  - or overlapping
    //
    let resultMatches = 0;
    if (cacheInterval === null || !queryInterval.overlaps(cacheInterval)) {
      // 0 / 1)
      resultMatches = this._countInRange(queryInterval.start, queryInterval.end, pObj);
    } else {
      let substractCache = [];
      let addCache = [];
      if (cacheInterval.isInside(queryInterval)) {
        const intervals = this._getNormalizedSplitIntervals(queryInterval,
                                                          cacheInterval,
                                                          cacheInterval);
        addCache = intervals.filter(interval => !interval.eql(cacheInterval));
      } else if (queryInterval.isInside(cacheInterval)) {
        const intervals = this._getNormalizedSplitIntervals(queryInterval,
                                                            cacheInterval,
                                                            queryInterval);
        substractCache = intervals.filter(interval => !interval.eql(queryInterval));
      } else {
        // overlaps
        const intervals = this._getNormalizedSplitIntervals(queryInterval,
                                                           cacheInterval,
                                                           cacheInterval);
        addCache = intervals.filter(interval => !interval.eql(cacheInterval));
        substractCache = intervals.filter(interval => !interval.eql(queryInterval));
      }

      // now we check if it is faster to calculate all again or the intervals
      let totalLen = 0;
      substractCache.forEach(i => (totalLen += i.len()));
      addCache.forEach(i => (totalLen += i.len()));
      if (totalLen > queryInterval.len()) {
        resultMatches = this._countInRange(queryInterval.start, queryInterval.end, pObj);
      } else {
        resultMatches = cache.count;
        substractCache.forEach(i => (resultMatches -= this._countInRange(i.start, i.end, pObj)));
        addCache.forEach(i => (resultMatches += this._countInRange(i.start, i.end, pObj)));
      }
    }

    this.cache.set(pid, { startMS, endMS, count: resultMatches });
    return resultMatches;
  }

  _getNormalizedSplitIntervals(qInterval, cInterval, keepInterval) {
    const intervals = qInterval.splitOverlaps(cInterval);
    // normalize them since we do not want to overlap with the query one
    for (let i = 0; i < intervals.length; i += 1) {
      const interval = intervals[i];
      // check if starts or end
      if (interval.end === keepInterval.start) {
        interval.end -= 1;
      } else if (interval.start === keepInterval.end) {
        interval.start += 1;
      }
    }
    return intervals;
  }

  _countInRange(leftIndex, rightIndex, patternObj) {
    let counter = 0;
    for (let i = leftIndex; i <= rightIndex; i += 1) {
      if (this.matchMethod(this.entries[i].urlData, patternObj)) {
        counter += 1;
      }
    }
    return counter;
  }

}
