import LoggingHandler from './logging_handler';
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

export {
  loadFileFromChrome,
  isCLIQZBrowser,
  openNewTabAndSelect
};
