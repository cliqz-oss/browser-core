
import moment from 'platform/moment';
import prefs from '../core/prefs';


/**
 * Format of the synchronized date as stored in the prefs.
 * @constant
 */
const SYNC_DATE_FORMAT = 'YYYYMMDD';

/**
 * Define standard date formats in anolysis module
 * @constant
 */
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DAY_FORMAT = 'YYYY-DDD';
export const WEEK_FORMAT = 'YYYY-WW';
export const MONTH_FORMAT = 'YYYY-M';


export default function getSynchronizedDate() {
  const formatted = prefs.get('config_ts', null);
  if (formatted !== null) {
    return moment(formatted, SYNC_DATE_FORMAT);
  }

  return null;
}

