import random from '../core/crypto/random';
import { utils } from '../core/cliqz';

function loadFileFromChrome(filePath) {
    var localURL = utils.environment.BASE_CONTENT_URL + filePath.join('/');
    return new Promise( (resolve, reject) => {
      utils.httpGet( localURL , res => {
        resolve(res.response);
      }, reject );
    });
}

function isCLIQZBrowser(settings) {
  return settings.channel === "40";
}

// generate a new UUID
function generateUUID() {
  function s4() {
    return Math.floor((1 + random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
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

export {
  loadFileFromChrome,
  isCLIQZBrowser,
  generateUUID,
  timestamp,
  timestampMS,
  weekDay,
  dayHour,
  getABNumber,
  hashString
};
