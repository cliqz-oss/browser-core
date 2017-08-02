import LoggingHandler from './logging_handler';
import random from '../core/crypto/random';
import { utils } from '../core/cliqz';

const MODULE_NAME = 'utils';


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

export {
  loadFileFromChrome,
  isCLIQZBrowser,
  generateUUID,
  timestamp,
  timestampMS,
};
