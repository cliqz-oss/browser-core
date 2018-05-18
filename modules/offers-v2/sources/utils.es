import random from '../core/crypto/random';
import OffersConfigs from './offers_configs';
import utils from '../core/utils';
import config from '../core/config';

// The backend timestamp stored as number (YYYYMMDD)
let BACKEND_TIMESTAMP;
// the backend date + local hour / min / secs / ms, into a timestamp, which it will
// be used as base for calculating future TS
let BACKEND_TS_MS;
// the starting local timestamp to be able to extract how many ms elapsed since last
// timestamp
let LOCAL_TS_MS_BASE;
// cached timestamp of offers module installed
let INSTALLED_OFFERS_MODULE_TS = null;


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
 * Will return the last time the offers module version was "installed"
 * We will do this checking the current prefs with the current version number
 * and a timestamp: extension_version|timestamp
 * If this field doesnt exist we will create it
 */
function getLatestOfferInstallTs() {
  if (INSTALLED_OFFERS_MODULE_TS !== null) {
    return INSTALLED_OFFERS_MODULE_TS;
  }
  // check if we have it
  const extensionVersion = String(config.EXTENSION_VERSION);
  const PREF_NAME = 'offersInstallInfo';

  const setInstallInfoPref = ts =>
    utils.setPref(PREF_NAME, `${extensionVersion}|${ts}`);

  const installInfo = utils.getPref(PREF_NAME, null);
  if (installInfo === null) {
    // create one and return
    INSTALLED_OFFERS_MODULE_TS = timestampMS();
    setInstallInfoPref(INSTALLED_OFFERS_MODULE_TS);
  } else {
    // we get the installed pref
    const fields = installInfo.split('|');
    const lastInstalledVer = fields[0];
    if (lastInstalledVer !== extensionVersion) {
      // its a different version we need to update the timestamp
      INSTALLED_OFFERS_MODULE_TS = timestampMS();
      setInstallInfoPref(INSTALLED_OFFERS_MODULE_TS);
    } else {
      // its the same version
      INSTALLED_OFFERS_MODULE_TS = Number(fields[1]);
      // check if is broken
      if (isNaN(INSTALLED_OFFERS_MODULE_TS)) {
        INSTALLED_OFFERS_MODULE_TS = timestampMS();
        setInstallInfoPref(INSTALLED_OFFERS_MODULE_TS);
      }
    }
  }
  return INSTALLED_OFFERS_MODULE_TS;
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

/**
 * generates a random number between [a, b)
 */
function randRange(a, b) {
  return Math.floor(Math.random() * (b - a)) + a;
}


/**
 * This method will check if we should keep or not the given resource.
 * We will check here if the pref for getting all resources is set or not as well
 */
function shouldKeepResource(userGroup) {
  // for now we will use offersDevFlag to accept all resources, we can change
  // this if required in the future
  if (OffersConfigs.IS_DEV_MODE) {
    // we keep it
    return true;
  }

  // now we should keep the resource if and only if
  // is not zero and localUserGroupNum >= userGroup
  // Since resources with userGroup == 0 => debug
  //
  const getLocalUserGroupNum = () => {
    // now check the real id
    const prefID = 'offersUserGroup';
    let localUserGroupNum = null;
    if (!utils.hasPref(prefID)) {
      // generate one in [1, 100]
      localUserGroupNum = randRange(1, 101);
      utils.setPref(prefID, localUserGroupNum.toString());
    } else {
      // we get it and transform it to localUserGroupNum
      localUserGroupNum = Number(utils.getPref(prefID, 0));
    }
    return localUserGroupNum;
  };

  // we should keep the resource if local userGroup > 0  and our num > resource num
  const localUserGroupNum = getLocalUserGroupNum();
  return (userGroup > 0) && (localUserGroupNum >= userGroup);
}


export {
  generateUUID,
  timestamp,
  timestampMS,
  weekDay,
  dayHour,
  getLatestOfferInstallTs,
  getABNumber,
  hashString,
  updateBETime,
  backendDayTs,
  backendMsTs,
  backendMinTs,
  orPromises,
  randRange,
  shouldKeepResource
};
