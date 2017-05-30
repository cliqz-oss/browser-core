
import moment from '../platform/moment';
import prefs from '../core/prefs';


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
    const year = formatted.substr(0, 4);
    const month = formatted.substr(4, 2);
    const day = formatted.substr(6, 2);
    return moment(`${year}-${month}-${day}`, DATE_FORMAT);
  }

  return null;
}

