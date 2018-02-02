import { getTodayDayKey } from '../../core/time';

const MAX_NUM_DAYS_TO_STORE = 365;

/**
 * This class will be used to keep track of how many urls did we process per day
 * (urls for now, in the future we may add extra information)
 */
export default class DayCounterHelper {
  constructor() {
    this.urlCountsPerDayMap = {};
  }

  serialize() {
    this._removeOldData();
    return { urlCountsPerDayMap: this.urlCountsPerDayMap };
  }

  deserialize(data) {
    this.urlCountsPerDayMap = data.urlCountsPerDayMap;
  }

  /**
   * we will merge the data from the history module into this one. We assume that
   * urlCountsPerDayEntriesMap is the "per_day" map from the history-analyzer
   */
  mergeDaysData(urlCountsPerDayEntriesMap) {
    const dayNames = Object.keys(urlCountsPerDayEntriesMap);
    for (let i = 0; i < dayNames.length; i += 1) {
      const dayName = dayNames[i];
      // we get the max always
      if (this.urlCountsPerDayMap[dayName] !== undefined) {
        this.urlCountsPerDayMap[dayName] = Math.max(
          this.urlCountsPerDayMap[dayName],
          urlCountsPerDayEntriesMap[dayName].c
        );
      } else {
        this.urlCountsPerDayMap[dayName] = urlCountsPerDayEntriesMap[dayName].c;
      }
    }
  }

  incToday() {
    const todayKey = getTodayDayKey();
    if (!this.urlCountsPerDayMap[todayKey]) {
      this.urlCountsPerDayMap[todayKey] = 0;
    }
    this.urlCountsPerDayMap[todayKey] += 1;
  }

  getCount(dayKey) {
    return this.urlCountsPerDayMap[dayKey];
  }

  _removeOldData() {
    // we can truncate till MAX_NUM_DAYS_TO_STORE days?
    const dayNames = Object.keys(this.urlCountsPerDayMap);
    if (dayNames.length > MAX_NUM_DAYS_TO_STORE) {
      // cut the oldest (meaning the sorted ones )
      dayNames.sort();
      const toCut = dayNames.length - MAX_NUM_DAYS_TO_STORE;
      for (let i = 0; i < toCut; i += 1) {
        delete this.urlCountsPerDayMap[dayNames[i]];
      }
    }
  }
}
