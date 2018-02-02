import logger from '../common/offers_v2_logger';
import { timestampMS } from '../utils';
import {
  getDaysFromTimeRange,
  getDateFromDateKey,
  getTodayDayKey
} from '../../core/time';


const getValidDaysFromHistory = (timeRangeSecs, historyData) => {
  const now = timestampMS();
  const startMS = now - (timeRangeSecs * 1000);
  const endMS = now;
  const supportedDays = new Set(getDaysFromTimeRange(startMS, endMS));
  const result = {};
  const dataDays = Object.keys(historyData.per_day);
  for (let i = 0; i < dataDays.length; i += 1) {
    const day = dataDays[i];
    if (supportedDays.has(day) &&
        historyData.per_day[day] &&
        historyData.per_day[day].m > 0) {
      result[day] = historyData.per_day[day];
    }
  }
  return result;
};

/**
 * definition of a category.
 * check https://cliqztix.atlassian.net/wiki/spaces/SBI/pages/144310279/Categories
 *
 * A category will be basically:
 * - name identifying the category (or id)
 * - list of patterns that identify the category
 * - the version of the category (for further updates)
 * - time window in seconds for the category (for how much time we want to track
 *   the category)
 * - extra information defining when the category will be considered active or not
 *
 * We will hold basically the following information:
 * - total number of urls processed.
 * - total number of matches of the category
 * - per day: how many matches and urls we have
 * - last timestamp we saw a match
 * - first timestamp we saw a match
 *
 *
 */
export default class Category {
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

    // temporary cache data (not persistent)
    this.todayKey = null;
    this.tmpActivationValue = null;

    this.activationFunctionMap = {
      normalized: this._normalizedResults.bind(this),
      simpleCount: this._simpleCountResults.bind(this),
    };
  }

  /**
   * we need to set this shared structure to be able to calculate if the category
   * is active or not
   */
  setTotalDayHandler(totalDayHandler) {
    this.totalDayHandler = totalDayHandler;
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
      const stillActive = ((now - this.lastActivationTS) / 1000) <=
        this.activationData.activationTimeSecs;
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
    const days = Object.keys(this.matchData.perDay);
    let modified = false;
    const catLifeTimeMs = this.timeRangeSecs * 1000;
    for (let i = 0; i < days; i += 1) {
      const dayTs = getDateFromDateKey(days[i]);
      const timeDiff = now - dayTs;
      if (timeDiff > catLifeTimeMs) {
        // we need to remove this day
        this._removeDay(days[i]);
        modified = true;
      }
    }
    if (modified) {
      this.lastUpdateTs = now;
    }
  }

  isObsolete() {
    const now = timestampMS();
    const expireMsCount = this.timeRangeSecs * 1000;
    let isObsolete = false;
    if (this.matchData.lastMatchTs === null) {
      isObsolete = (now - this.createdTs) > expireMsCount;
    } else {
      isObsolete = (now - this.matchData.lastMatchTs) > expireMsCount;
    }
    return isObsolete;
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

  updateWithHistoryData(data) {
    if (!data || !data.per_day) {
      throw new Error('invalid history data', data);
    }
    // reset match data
    this.matchData = this._defaultMatchData();
    this.isHistoryDataSet = true;

    let updated = false;
    const validDays = getValidDaysFromHistory(this.timeRangeSecs, data);
    const dayList = Object.keys(validDays);
    for (let i = 0; i < dayList.length; i += 1) {
      const day = dayList[i];
      const dataDay = validDays[day];
      const dayTS = getDateFromDateKey(day);

      this.matchData.perDay[day] = { matches: dataDay.m };
      this.matchData.total.matches += dataDay.m;
      this.matchData.firstMatchTs = Math.min(this.matchData.firstMatchTs, dayTS);
      this.matchData.lastMatchTs = Math.max(this.matchData.lastMatchTs, dayTS);
      updated = true;
      // note: it can happen that if todayKey == day then we need to do more
      // deep checks since we may miss some hit to the category here (the
      // history query can be delayed and the user can navigate on the category.
      // still is not so probably)
    }

    if (updated) {
      this.lastUpdateTs = timestampMS();
    }
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

  // ///////////////////////////////////////////////////////////////////////////
  //                      Activation functions here
  // ///////////////////////////////////////////////////////////////////////////

  _simpleCountResults({ numDays, totNumHits }) {
    return ((numDays === undefined) || (this.countDaysWithMatches() >= numDays)) &&
           ((totNumHits === undefined) || (this.getTotalMatches() >= totNumHits));
  }

  _normalizedResults(args) {
    // check cached results:
    const todayKey = getTodayDayKey();
    if (todayKey !== this.todayKey ||
        this._sumTotalCount === undefined) {
      this._sumTotalCount = 0;
      this._sumTotMatches = 0;
      if (args.endDayIdx > 0) {
        const prevResults = this._gatherPrevDaysData(args.endDayIdx, args.startDayIdx);
        for (let i = 0; i < prevResults.length; i += 1) {
          this._sumTotalCount += prevResults[i].t;
          this._sumTotMatches += prevResults[i].m;
        }
      }
    }

    let sumTotal = this._sumTotalCount;
    let sumMatches = this._sumTotMatches;
    // check if we have to get today as well
    if (args.startDayIdx === 0) {
      const todayData = this._gatherTodayData();
      sumTotal += todayData.t;
      sumMatches += todayData.m;
    }
    const resultValue = sumTotal > 0.0 ? (sumMatches / sumTotal) : 0.0;
    return resultValue >= args.threshold;
  }

  /**
   * This method will gather all the data for all the days this category will
   * use except today (since will change)
   * The return value will be a list of { t: total urls, m: matches }
   * @return {[type]} [description]
   */
  _gatherPrevDaysData(startDayIdx, endDayIdx) {
    // calculate the days except today
    const todayKey = getTodayDayKey();
    const dayMS = 1000 * 60 * 60 * 25;
    const now = timestampMS();
    const start = now - (dayMS * startDayIdx);
    const end = now - (dayMS * endDayIdx);
    const activationDays = getDaysFromTimeRange(start, end).filter(x => x !== todayKey);

    // get the values
    const result = [];
    for (let i = 0; i < activationDays.length; i += 1) {
      const ad = activationDays[i];
      const totCount = this.totalDayHandler.getCount(ad);
      const matchValue = this.matchData.perDay[ad]
        ? this.matchData.perDay[ad].matches
        : undefined;
      if (totCount === undefined || matchValue === undefined) {
        logger.info(`Warning: we do not have information yet for the day ${ad}`);
        // we need to avoid calculating it now and we should calculate it later
        return -1;
      }
      result.push({ t: totCount, m: matchValue });
    }

    return result;
  }

  /**
   * will return the {t: total urls, m: total matches} for today
   */
  _gatherTodayData() {
    const todayKey = getTodayDayKey();
    const totToday = this.totalDayHandler.getCount(todayKey);
    let totMathes = 0;
    if (totToday > 0.0 && this.matchData.perDay[todayKey]) {
      totMathes = this.matchData.perDay[todayKey].matches;
    }
    return { t: totToday, m: totMathes };
  }
}
