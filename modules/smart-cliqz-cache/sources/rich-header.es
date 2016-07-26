Components.utils.import('chrome://cliqzmodules/content/Result.jsm');

import { utils } from 'core/cliqz';

export function getSmartCliqz(id) {
  utils.log('getSmartCliqz: start fetching for id ' + id);

  return new Promise((resolve, reject) => {
    const endpointUrl = 'http://newbeta.cliqz.com/api/v1/rich-header?path=/id_to_snippet&q=' + id;

    utils.httpGet(endpointUrl, (function success(req) {
      try {
        const smartCliqzData = JSON.parse(req.response).extra.results[0];
        const smartCliqzIdExists = (typeof smartCliqzData !== 'undefined');
        let smartCliqz;

        if (!smartCliqzIdExists) {
          reject({
            type: 'ID_NOT_FOUND',
            message: id + ' not found on server'
          });
        } else {
          smartCliqz = Result.cliqzExtra(smartCliqzData);
          utils.log('getSmartCliqz: done fetching for id ' + id);
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
