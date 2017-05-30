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

// TODO: we can use utils.openTabInWindow()
function openNewTabAndSelect(url) {
  var currWindow = utils.getWindow();
  if (!currWindow) {
    return false;
  }
  utils.openTabInWindow(currWindow, url);
  return true;
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

export {
  loadFileFromChrome,
  isCLIQZBrowser,
  openNewTabAndSelect,
  generateUUID
};
