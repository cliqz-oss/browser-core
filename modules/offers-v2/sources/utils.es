import random from '../core/crypto/random';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import FastURL from '../core/fast-url-parser';

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
  const extensionVersion = String(inject.app.version);
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
 * generates a random number between [a, b)
 */
function randRange(a, b) {
  return Math.floor(Math.random() * (b - a)) + a;
}

/**
 * This method will check if we should keep or not the given resource.
 * We will check here if the pref for getting all resources is set or not as well
 */
function shouldKeepResource(resourceWeight) {
  const prefID = 'offersUserGroup';
  const userGroup = Number(prefs.get(prefID, -1));
  const isValid = !Number.isNaN(userGroup) && (userGroup >= 0);
  const newUserGroup = isValid ? userGroup : randRange(0, 100); // generate one in [0, 100);
  if (!isValid) { prefs.set(prefID, newUserGroup.toString()); }
  return newUserGroup >= resourceWeight;
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

function isDeveloper() {
  return prefs.get('developer', false) || prefs.get('offersDevFlag', false);
}

// rewrite google serp url to avoid that blacklisting reacts on
// google tracking with words like "firefox" and "ubuntu"
function rewriteGoogleSerpUrl(url) {
  let fu;
  try {
    fu = new FastURL(url);
  } catch (e) {
    return url;
  }
  const domain = fu.generalDomain;
  if (!(domain && domain.startsWith('google.'))) {
    return url;
  }
  if (fu.pathname !== '/search') {
    return url;
  }
  const searchParams = new Map(fu.searchParams.params);
  const query = searchParams.get('q') || searchParams.get('query');
  if (!query) {
    return url;
  }
  const prefix = url.substr(0, url.indexOf('?'));
  return `${prefix}?q=${query}`;
}

function rewriteUrlForOfferMatching(url) {
  return rewriteGoogleSerpUrl(url);
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
  randRange,
  shouldKeepResource,
  isDeveloper,
  rewriteUrlForOfferMatching
};
