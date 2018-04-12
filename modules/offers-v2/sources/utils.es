import random from '../core/crypto/random';
import { utils } from '../core/cliqz';

// The backend timestamp stored as number (YYYYMMDD)
let BACKEND_TIMESTAMP;
// the backend date + local hour / min / secs / ms, into a timestamp, which it will
// be used as base for calculating future TS
let BACKEND_TS_MS;
// the starting local timestamp to be able to extract how many ms elapsed since last
// timestamp
let LOCAL_TS_MS_BASE;

// generate a new UUID
function generateUUID() {
  function s4() {
    return Math.floor((1 + random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function timestamp() {
  return Math.round(Date.now() / 1000);
}

function timestampMS() {
  return Date.now();
}

function weekDay() {
  return new Date().getDay() + 1;
}

function dayHour() {
  return new Date().getHours();
}

/**
 * This method will return the unique generated number for a particular browser.
 * If the value is not generated yet will create a new one.
 * @return {int} the unique number we have for this user, the values will be between
 *               [0, 9999].
 */
function getABNumber() {
  const prefID = 'offersUniqueNumber';
  let num = null;
  if (!utils.hasPref(prefID)) {
    // generate one
    num = Math.floor(random() * 10000);
    utils.setPref(prefID, num.toString());
  } else {
    // we get it and transform it to num
    num = Number(utils.getPref(prefID, 0));
  }

  return num;
}

/**
 * this will generate a hash for the given string
 * @param  {[type]} str [description]
 * @return {[type]}     [description]
 */
function hashString(str) {
  // copied from fast hash from adblocker/utils

  /* eslint-disable no-bitwise */

  let hash = 5381;
  for (let i = 0, len = str.length; i < len; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  // For higher values, we cannot pack/unpack
  return (hash >>> 0) % 2147483648;
}


/**
 * this method should be called everytime there is an update of the date on the BE
 * @param  {[type]} ts [description]
 * @return {[type]}    [description]
 */
function updateBETime(ts) {
  // we need to store the variable here as number
  if (!ts || ts.length !== 8) {
    // invalid format?
    return false;
  }
  // format: YYYYMMDD
  const year = ts.slice(0, 4);
  const month = ts.slice(4, 6);
  const day = ts.slice(6, 8);
  // we will get the hour / minutes and seconds from current local timestamp and
  // we will start using it as
  LOCAL_TS_MS_BASE = Date.now();
  const now = new Date();
  const localDate = new Date(
    year,
    month,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
  BACKEND_TS_MS = localDate.getTime();
  BACKEND_TIMESTAMP = Number(ts);
  return true;
}

/**
 * this function will return the day level timestamp
 * @return {Number} the day level timestamp format: YYYYMMDD
 */
function backendDayTs() {
  return BACKEND_TIMESTAMP;
}

/**
 * this is the same than Date.now() but using a combination of local + BE timestamp.
 * @return {Number} number of ms from unix epoach (using BE reference at day lvl)
 */
function backendMsTs() {
  // calc elapsed ms
  const delta = Date.now() - LOCAL_TS_MS_BASE;
  return BACKEND_TS_MS + delta;
}

/**
 * this function will return the minute level timestamp
 * @return {number} the minute level timestamp
 */
function backendMinTs() {
  return Math.floor((backendMsTs() / 1000) / 60);
}

/**
 * Perform an sequential or on a list of functions that should return a promise.
 * Given a list pf = [function1, function2, ...], where each function returns a
 * promise, will check function1() || function2() || ...
 * and return true if any of them returns true, otherwise false.
 */
function orPromises(elemList, idx = 0) {
  if (!elemList || idx >= elemList.length) {
    return Promise.resolve(false);
  }
  const first = elemList[idx];
  return first().then((r) => {
    if (r) {
      return Promise.resolve(true);
    }
    // if we are in the last case return
    if (elemList.length === (idx + 1)) {
      return Promise.resolve(false);
    }
    return orPromises(elemList, idx + 1);
  });
}

export {
  generateUUID,
  timestamp,
  timestampMS,
  weekDay,
  dayHour,
  getABNumber,
  hashString,
  updateBETime,
  backendDayTs,
  backendMsTs,
  backendMinTs,
  orPromises
};
