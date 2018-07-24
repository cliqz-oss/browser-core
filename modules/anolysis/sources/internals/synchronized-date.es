import getSynchronizedDate from '../../core/synchronized-time';

export { default } from '../../core/synchronized-time';

/**
 * Define standard date formats in anolysis module
 * @constant
 */
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DAY_FORMAT = 'YYYY-DDD';
export const WEEK_FORMAT = 'YYYY-WW';
export const MONTH_FORMAT = 'YYYY-M';

export function getSynchronizedDateFormatted() {
  return getSynchronizedDate().format(DATE_FORMAT);
}
