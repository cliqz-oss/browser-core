import logger from './logger';
import { timestamp } from './time_utils';

/**
 * This class / structure will contain the history-related information for a given
 * pattern set (pattern set = pattern list). This pattern set are identified by
 * an unique id (for example, the hash(list_patterns)).
 * The history-related data contained is basically 2 groups of things:
 * Metainformation (info) like when was accessed / created / modified to used
 * later to know if we should remove the entry or not (not accessed in the last N
 * days for example).
 *
 * We also will hold the matching data (match_data) that will basically contains
 * a map of day -> num of matches / total urls checked for that day for the given
 * pattern / etc.
 * We will also hold the total number of matches (for all those days).
 * {
 *   info: {
 *     // when this entry was created
 *     created_ts: X,
 *     // last time the entry was updated
 *     last_updated_ts: M,
 *     // the last time this entry was accessed / requested for information
 *     last_accessed_ts: Z,
 *   },
 *   match_data: {
 *     total: {
 *       // total of number of days we have info regarding this entry
 *       num_days: N,
 *       // the total number of matches on those days
 *       m: M,
 *       // the total number of urls we checked on history on those days for this
 *       // particular pattern.
 *       c: X,
 *
 *       // the following keys will store the first and last day we see that
 *       // we analyzed the data, NOTE THAT THIS DOESNT MEANS THAT WE READ ALL
 *       // IN BETWEEN, it could be that we just read part of it or some intervals
 *       // NOT IMPLEMENTED YET
 *
 *       // this will contain the timestamp on ms of the latest history url processed
 *       // for this particular entry
 *       last_checked_url_ts: Z,
 *       // the latest day we have analyzed (key format)
 *       last_day_key: X,
 *       // the first day we analyzed
 *       first_day_key: Y,
 *     },
 *     per_day: {
 *       // we will store the data in the following format: YYYYMMDD
 *       day_key_1: {
 *         // the number of matches for this particular day
 *         m: N,
 *         // the number of urls checked on this day
 *         c: M,
 *         // the last time we accessed / used this day data
 *         last_accessed_ts: X,
 *       },
 *       ...
 *     }
 *   }
 * }
 */
export default class HistoryEntry {
  constructor(data = null) {
    const now = timestamp();
    if (data) {
      this.data = data;
    } else {
      this.data = {
        info: {
          created_ts: now,
          last_updated_ts: now,
          last_accessed_ts: now
        },
        match_data: {
          total: {
            num_days: 0,
            m: 0,
            c: 0,
            last_checked_url_ts: 0,
            last_day_key: null,
            first_day_key: null
          },
          per_day: {}
        }
      };
    }
  }

  /**
   * will return the content of the object so can be serialized
   * @return {[type]} [description]
   */
  getData() {
    return this.data;
  }

  hasProcessedDay(dateKey) {
    return !!this.data.match_data.per_day[dateKey];
  }

  /**
   * this will change the last access date to the entry
   */
  getProcessedDayData(dateKey) {
    if (!dateKey) {
      return null;
    }
    const dayEntry = this.data.match_data.per_day[dateKey];
    if (!dayEntry) {
      return null;
    }
    this._updateLastAccessDate(dateKey);
    return dayEntry;
  }

  /**
   * will create an object containing the days in the given list (or null if we
   * do not have it) with the following information:
   * {
   *   match_data: {
   *     total: {
   *       // total of number of days we have info regarding this entry
   *       num_days: N,
   *       // the total number of matches on those days
   *       m: M,
   *       // the total number of urls we checked on history on those days for this
   *       // particular pattern.
   *       c: X,
   *       // the last timestamp of the last url we have checked (it can be that
   *       // is not in the query of those days).
   *       last_checked_url_ts: T,
   *     },
   *     per_day: {
   *       // we will store the data in the following format: YYYYMMDD
   *       day_key_1: {
   *         // the number of matches for this particular day
   *         m: N,
   *         // the number of urls checked on this day
   *         c: M,
   *         // the last time we accessed / used this day data
   *         last_accessed_ts: X,
   *       },
   *       ...
   *     }
   *   }
   * }
   */
  getDataForDays(dayList) {
    const result = {
      match_data: {
        total: {
          num_days: 0,
          m: 0,
          c: 0,
          last_checked_url_ts: this.data.match_data.total.last_checked_url_ts,
        },
        per_day: {}
      }
    };

    const incrementTotalDataFromDay = (t, dayData) => {
      /* eslint-disable no-param-reassign */
      t.num_days += 1;
      t.m += dayData.m;
      t.c += dayData.c;
    };

    for (let i = 0; i < dayList.length; i += 1) {
      const dayKey = dayList[i];
      const processedDay = this.getProcessedDayData(dayKey);
      if (processedDay !== null) {
        result.match_data.per_day[dayKey] = processedDay;
        incrementTotalDataFromDay(result.match_data.total, processedDay);
      }
    }
    return result;
  }

  /**
   * will add / set / update new data for a particular day
   * @param {[type]} dateKey the datekey
   * @param {[type]} data    object containing the following infomration:
   * {
   *   m: num of matches,
   *   c: the number of url processed for that day,
   *   last_ts: the last url timestamp analyzed for that particular day,
   * }
   */
  setDayData(dateKey, data) {
    if (!dateKey || !this._checkDayData(data) || !data.last_ts) {
      logger.error(`Invalid arguments provided for adding data: ${dateKey} - ${data}`);
      return false;
    }
    this._removeDay(dateKey);
    return this._addDayData(dateKey, data, data.last_ts);
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                            Private methods
  // ///////////////////////////////////////////////////////////////////////////
  //

  _updateLastAccessDate(dateKey) {
    const entry = this.data.match_data.per_day[dateKey];
    if (!entry) {
      return;
    }
    const now = timestamp();
    entry.last_accessed_ts = now;
    this.data.last_accessed_ts = now;
  }

  _updateLastModifiedDate(/* dateKey */) {
    // we do not have this per date so skip
    const now = timestamp();
    this.data.last_updated_ts = now;
  }

  _removeDay(dateKey) {
    const entry = this.data.match_data.per_day[dateKey];
    if (!entry) {
      return;
    }
    // substract from the general stats
    const totData = this.data.match_data.total;
    totData.num_days -= 1;
    totData.m -= entry.m;
    totData.c -= entry.c;
    this._updateLastAccessDate(dateKey);
    this._updateLastModifiedDate();
    delete this.data.match_data.per_day[dateKey];
  }

  _addDayData(dateKey, data, lastUrlTS) {
    if (!dateKey || !this._checkDayData(data) || !lastUrlTS) {
      logger.error(`Invalid arguments provided for adding data: ${dateKey} - ${data}`);
      return false;
    }
    // ensure we do not have the entry already
    if (this.hasProcessedDay(dateKey)) {
      logger.error('We already have that day here, we should not add => inconsistent data');
      return false;
    }
    this.data.match_data.per_day[dateKey] = {
      m: data.m,
      c: data.c,
      last_accessed_ts: 0
    };
    // add data to the global information
    const totData = this.data.match_data.total;
    totData.num_days += 1;
    totData.m += data.m;
    totData.last_checked_url_ts = Math.max(lastUrlTS, totData.last_checked_url_ts);
    totData.c += data.c;

    // update the last_access here and the general one as well
    this._updateLastAccessDate(dateKey);
    this._updateLastModifiedDate();
    return true;
  }

  _checkDayData(data) {
    return data && (data.m !== undefined) && (data.c !== undefined);
  }

}
