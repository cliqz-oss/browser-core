import random from '../core/crypto/random';
import OffersConfigs from './offers_configs';
import prefs from '../core/prefs';
import config from '../core/config';

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

function getLatestOfferInstallTs() {
  const extensionVersion = String(config.EXTENSION_VERSION);
  const ts = +timestampMS();

  const installInfo = prefs.get('offersInstallInfo', null);
  if (installInfo === null) {
    prefs.set('offersInstallInfo', `${extensionVersion}|${ts}`);
    return ts;
  }

  const [lastInstalledVer, tsStr] = installInfo.split('|');
  if (lastInstalledVer !== extensionVersion) {
    prefs.set('offersInstallInfo', `${extensionVersion}|${ts}`);
    return ts;
  }

  if (!isNaN(+tsStr)) {
    return +tsStr;
  }

  prefs.set('offersInstallInfo', `${extensionVersion}|${ts}`);
  return ts;
}

/**
 * This method will return the unique generated number for a particular browser.
 * @return {int} the unique number we have for this user, the values will be between
 *               [0, 9999].
 */
function getABNumber() {
  if (prefs.has('offersUniqueNumber')) {
    return +prefs.get('offersUniqueNumber', 0);
  }

  const num = Math.floor(random() * 10000);
  prefs.set('offersUniqueNumber', String(num));
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
    if (!prefs.has(prefID)) {
      // generate one in [1, 100]
      localUserGroupNum = randRange(1, 101);
      prefs.set(prefID, localUserGroupNum.toString());
    } else {
      // we get it and transform it to localUserGroupNum
      localUserGroupNum = Number(prefs.get(prefID, 0));
    }
    return localUserGroupNum;
  };

  // we should keep the resource if local userGroup > 0  and our num > resource num
  const localUserGroupNum = getLocalUserGroupNum();
  return (userGroup > 0) && (localUserGroupNum >= userGroup);
}

function oncePerInterval(f, shift = 1000 * 60 * 5) {
  const m = {};
  return function wrapper(obj = {}) {
    const { key = 'default-key' } = obj;
    if (m[key] && (m[key] + shift > Date.now())) {
      return { cached: true };
    }
    m[key] = Date.now();
    f.apply(this, [obj]);
    return { cached: false };
  };
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
  oncePerInterval,
  orPromises,
  randRange,
  shouldKeepResource
};
