import logger from './logger';
import moment from '../platform/moment';

/**
 * will return a list of date keys of all the days that we have between those
 * 2 timestamps (milliseconds from epoch). The range is inclusive for start and end
 * On error we return Null
 * @param  {[type]} startTS [description]
 * @param  {[type]} endTS   [description]
 * @return {[type]}         [description]
 */
function getDaysFromTimeRange(startTS, endTS) {
  if (endTS < startTS) {
    logger.log(`endTS is < than startTS: ${endTS} < ${startTS}`);
    return null;
  }

  let currDate = moment(startTS).startOf('day');
  const lastDate = moment(endTS).startOf('day');

  // check the diff in terms of days, if the diff is longer than MAX_DAYS we limit
  // return false
  const MAX_DAYS_RANGE = 365 * 5; // 5 years?
  let diffDaysCount = lastDate.diff(currDate, 'days');
  if (diffDaysCount > MAX_DAYS_RANGE) {
    logger.log(`we cannot get more than ${MAX_DAYS_RANGE} and we query ${diffDaysCount}`);
    // we will set the new time limit here
    currDate = lastDate.clone().subtract(MAX_DAYS_RANGE, 'days');
    diffDaysCount = MAX_DAYS_RANGE;
  }

  const result = [Number(currDate.format('YYYYMMDD'))];
  while (diffDaysCount > 0) {
    result.push(Number(currDate.add(1, 'days').format('YYYYMMDD')));
    diffDaysCount -= 1;
  }
  return result;
}

function getTodayDayKey() {
  return Number(moment().format('YYYYMMDD'));
}

function getDateFromDateKey(dateKey, hours = 0, min = 0, seconds = 0) {
  const hstr = hours < 10 ? `0${hours}` : `${hours}`;
  const mstr = min < 10 ? `0${min}` : `${min}`;
  const sstr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return Number(moment(`${dateKey}:${hstr}:${mstr}:${sstr}`, 'YYYYMMDD:HH:mm:ss')
    .format('x'));
}

function timestamp() {
  return Date.now();
}

export {
  getDaysFromTimeRange,
  getTodayDayKey,
  timestamp,
  getDateFromDateKey
};
