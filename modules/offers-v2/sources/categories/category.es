import logger from '../common/offers_v2_logger';
import { timestampMS } from '../utils';
import {
  getDateFromDateKey,
  getTodayDayKey,
} from '../../core/time';
import { getStartDayKey } from './day-counter-helper';


// This constant will be used to define for how long we want to keep the category
// on the client while we see there is any activity. Once we do not see any
// activity for more than CATEGORY_LIFE_TIME_SECS on the category we will remove
// it from the DB.
const CATEGORY_LIFE_TIME_SECS = 60 * 60 * 24 * 15; // for at least 15 days

/**
 * Extra information defining when the category will be considered active or not
 * {
 *   func: "simpleCount", // in past also "normalized"
 *   args: Object, // arguments to `func`
 *   activationTimeSecs: number, // how long the category will be active
 * }
 * @class CategoryActivationData
 */

/**
 * We will hold basically the following information:
 * - total number of urls processed.
 * - total number of matches of the category
 * - per day: how many matches and urls we have
 * - last timestamp we saw a match
 * - first timestamp we saw a match
 *
 * @class Category
 */
export default class Category {
  /**
   *
   * @param {string} name: identifying the category (or id)
   * @param {string[]} patterns: list of patterns that identify the category
   * @param {number} version: the version of the category (for further updates)
   * @param {number} timeRangeSecs: time window in seconds for the category
   *   (for how much time we want to track the category)
   * @param {ActivationDate} activationData
   * @constructor
   */
  constructor(name, patterns, version, timeRangeSecs, activationData) {
    // general category data
    this.name = name;
    this.patterns = patterns;
    this.version = version;
    this.timeRangeSecs = timeRangeSecs;
    this.activationData = activationData;

    const now = timestampMS();
    this.lastUpdateTs = now;
    this.createdTs = now;

    // match data
    this.matchData = this._defaultMatchData();
    this.lastActivationTS = null;

    this.isHistoryDataSet = false;

    this.activationFunctionMap = {
      simpleCount: this._simpleCountResults.bind(this),
    };
  }

  // serialize
  serialize() {
    return {
      name: this.name,
      patterns: this.patterns,
      version: this.version,
      timeRangeSecs: this.timeRangeSecs,
      lastUpdateTs: this.lastUpdateTs,
      createdTs: this.createdTs,
      matchData: this.matchData,
      isHistoryDataSet: this.isHistoryDataSet,
      activationData: this.activationData,
      lastActivationTS: this.lastActivationTS,
    };
  }

  // deserialize
  deserialize(data) {
    this.name = data.name;
    this.patterns = data.patterns;
    this.version = data.version;
    this.lastUpdateTs = data.lastUpdateTs;
    this.createdTs = data.createdTs;
    this.timeRangeSecs = data.timeRangeSecs;
    this.matchData = data.matchData;
    this.isHistoryDataSet = data.isHistoryDataSet;
    this.activationData = data.activationData;
    this.lastActivationTS = data.lastActivationTS;
  }

  getName() {
    return this.name;
  }

  // revision hash
  getVersion() {
    return this.version;
  }

  hasPatterns() {
    return !!this.patterns;
  }

  getPatterns() {
    return this.patterns;
  }

  isHistoryDataSettedUp() {
    return this.isHistoryDataSet;
  }

  isActive() {
    const now = timestampMS();
    if (this.lastActivationTS !== null) {
      const stillActive = ((now - this.lastActivationTS) / 1000)
        <= this.activationData.activationTimeSecs;
      if (stillActive) {
        return true;
      }
      this.lastActivationTS = null;
    }

    // we need to check
    const activationFun = this.activationFunctionMap[this.activationData.func];
    if (!activationFun) {
      logger.error(`We do not have the activation function ${this.activationData.func}`);
      return false;
    }
    const activationResult = activationFun(this.activationData.args);
    if (activationResult) {
      // cache the result here
      this.lastActivationTS = now;
    }


    return activationResult;
  }

  getTimeRangeSecs() {
    return this.timeRangeSecs;
  }

  // we will check if need to remove old data
  cleanUp() {
    const now = timestampMS();
    const todayKey = getTodayDayKey();
    const days = Object.keys(this.matchData.perDay);
    let modified = false;
    const catLifeTimeMs = this.timeRangeSecs * 1000;
    for (let i = 0; i < days.length; i += 1) {
      // since we do not have more detailed precision for now (hour level), and
      // "today" case is an special case because we cannot know the hits per
      // hour, so we will skip the checking of today
      if (days[i] !== todayKey) {
        const dayTs = getDateFromDateKey(days[i], 12);
        const timeDiff = now - dayTs;
        if (timeDiff > catLifeTimeMs) {
          // we need to remove this day
          this._removeDay(days[i]);
          modified = true;
        }
      }
    }
    if (modified) {
      this.lastUpdateTs = now;
    }
  }

  hit() {
    const now = timestampMS();
    if (this.matchData.firstMatchTs === null) {
      this.matchData.firstMatchTs = now;
    }
    this.matchData.lastMatchTs = now;
    this.matchData.total.matches += 1;

    const todayKey = getTodayDayKey();
    let todayMatchData = this.matchData.perDay[todayKey];
    if (!todayMatchData) {
      todayMatchData = { matches: 0 };
      this.matchData.perDay[todayKey] = todayMatchData;
    }
    todayMatchData.matches += 1;

    this.lastUpdateTs = now;
  }

  /**
   * Transfer per-day counting of matches from history to local accounting.
   *
   * There are complications:
   * - local counting can already exist
   * - history can be disabled, and therefore `data` is empty
   *
   * In case local and history counts are different, if the history count
   * is bigger, then we use it. Otherwise, the local count is retained.
   *
   * @method updateWithHistoryData
   * @param {DayCounter} data
   * @returns void
   * Set `isHistoryDatSet` to true.
   * Update `matchData`, in particular `perDay`, `total.matches`,
   * `firstMatchTs` and `lastMatchTs`.
   */
  updateWithHistoryData(data) {
    if (!data || !data.per_day) {
      logger.error('invalid history data', data);
      return;
    }

    let updated = false;

    Object.entries(data.per_day).forEach(([day, { m: historyCount }]) => {
      const localCount = (this.matchData.perDay[day] || {}).matches || 0;
      if (historyCount > localCount) {
        this.matchData.perDay[day] = { matches: historyCount };
        this.matchData.total.matches += (historyCount - localCount);
        const dayTS = getDateFromDateKey(day, 12);
        this.matchData.firstMatchTs = Math.min(this.matchData.firstMatchTs, dayTS);
        this.matchData.lastMatchTs = Math.max(this.matchData.lastMatchTs, dayTS);
        updated = true;
      }
    });

    if (updated) {
      this.lastUpdateTs = timestampMS();
    }
    this.isHistoryDataSet = true;
  }

  getTotalMatches() {
    return this.matchData.total.matches;
  }

  getLastMatchTs() {
    return this.matchData.lastMatchTs;
  }

  getFirstMatchTs() {
    return this.matchData.firstMatchTs;
  }

  countDaysWithMatches() {
    return Object.keys(this.matchData.perDay).length;
  }

  _removeDay(dayKey) {
    // decrease the counter
    this.matchData.total.matches -= this.matchData.perDay[dayKey].matches;
    delete this.matchData.perDay[dayKey];
    this.lastUpdateTs = timestampMS();
  }

  _defaultMatchData() {
    return {
      total: {
        matches: 0,
      },
      perDay: {},
      firstMatchTs: null,
      lastMatchTs: null,
    };
  }

  /**
   * Check if the category is matched at least `minMatchesIn` times
   * during the last `durationDays`.
   *
   * @method match
   * @param {number} minMatchesIn
   *   How many matches required. Default is 1.
   * @param {number} durationDays
   *   Number of days between the begin and the end of the time range.
   *   If undefined, consider the whole history.
   * @param now
   * @returns {[boolean, number]} [isMatched, confidence]
   *   `confidence` is a value 0 or 1 (in far future in range [0, 1]).
   *   If the answer is `isMatched=false` and history is not loaded,
   *   then confidence is zero. Otherwise it is 1.
   */
  probe(minMatchesIn, durationDays, now = new Date()) {
    const minMatches = minMatchesIn || 1;
    const startDay = getStartDayKey(durationDays, now);

    let matchesOverRange = 0;
    for (const [day, { matches }] of Object.entries(this.matchData.perDay)) {
      if (day >= startDay) {
        matchesOverRange += matches;
        if (matchesOverRange >= minMatches) {
          // matched
          return [true, 1];
        }
      }
    }

    // not matched
    const confidence = Number(this.isHistoryDataSettedUp());
    return [false, confidence];
  }

  /**
   * Helper for a caller that caches result of `match`. Each time the
   * sentinel is changed, the caller should call `match` again.
   *
   * @method getCacheSentinel
   * @returns {string}
   */
  getCacheSentinel() {
    return `${getTodayDayKey()}-${this.getLastMatchTs()}`;
  }

  //
  // Handler of the activation function `simpleCount`.
  // Object `CategoryActivationData` from the backend looks like:
  //
  // activationData: {
  //   activationTimeSecs: 10,
  //   func: 'simpleCount',
  //   args: {
  //     totNumHits: 8,
  //     numDays: 2,
  //   }
  // }
  //
  // `numDays` defines the minimum number of different days we have to
  //   see on the category being activated to use this.
  // `totNumHits`: the number of total hits that we saw in all the
  //   times for the category.
  // We can use, one of them or both, if both then we should met both
  // conditions (AND).
  //
  _simpleCountResults({ numDays, totNumHits }) {
    return ((numDays === undefined) || (this.countDaysWithMatches() >= numDays))
           && ((totNumHits === undefined) || (this.getTotalMatches() >= totNumHits));
  }
}

export {
  CATEGORY_LIFE_TIME_SECS
};
