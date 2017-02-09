import { utils } from 'core/cliqz';
import Result from "autocomplete/result";

export function getSmartCliqz(url) {
  utils.log('getSmartCliqz: start fetching for ' + url);

  return new Promise((resolve, reject) => {
    const endpointUrl = 'https://api.cliqz.com/api/v1/rich-header?path=/map&bmresult=' + url;

    utils.httpGet(endpointUrl, (function success(req) {
      try {
        const smartCliqzData = JSON.parse(req.response).results[0];
        const smartCliqzExists = (typeof smartCliqzData !== 'undefined');
        let smartCliqz;

        if (!smartCliqzExists) {
          reject({
            type: 'URL_NOT_FOUND',
            message: url + ' not found on server'
          });
        } else {
          smartCliqz = Result.cliqz(smartCliqzData);
          utils.log('getSmartCliqz: done fetching for ' + url);
          resolve(smartCliqz);
        }
      } catch (e) {
        reject({
          type: 'UNKNOWN_ERROR',
          message: e
        });
      }
    }).bind(this), function error() {
      reject({
        type: 'HTTP_REQUEST_ERROR',
        message: ''
      });
    });
  });
}
