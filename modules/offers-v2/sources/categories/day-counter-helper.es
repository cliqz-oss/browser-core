import moment from '../../platform/lib/moment';
import { getTodayDayKey } from '../../core/time';

/**
 * {
 *   m: number, // number of matches this day
 *   c: number, // total number of all urls this day
 * }
 * @class OneDayCounter
 */

/**
 * {
 *   total: {
 *     num_days: number,
 *     m: number, // see OneDayCounter
 *     c: number, // see OneDayCounter
 *     last_checked_url_ts: number, // ms, the most recent url
 *   },
 *   per_day: {
 *     YYYYMMDD: OneDayCounter, // one day
 *     YYYYMMDD: OneDayCounter, // another day
 *     ...
 *   }
 * }
 * @class DayCounter
 */

/**
 * @method getStartDayKey
 * @param {number} durationDays number of days in the interval.
 *   If undefined, returns 00000000
 * @param {Date} now interval end
 * @returns {string} Date key in the format YYYYMMDD
 */
function getStartDayKey(durationDays, now) {
  if (typeof durationDays === 'undefined') {
    return '00000000';
  }
  return moment(now).subtract(durationDays, 'd').format('YYYYMMDD');
}

export {
  getStartDayKey,
  getTodayDayKey
};
