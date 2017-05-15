/*
 * This module listens to the http traffic
 */

import WebRequest from '../core/webrequest';
import utils from '../core/utils';

const CliqzRedirect = {

  httpObserver: {
    // check the non 2xx page and report if this is one of the cliqz result
    observeActivity: function onPageLoad({ url, responseStatus: status, type }) {
      // check only document load
      if (type !== 6) {
        return;
      }

      // ignore succesful loads
      if (Math.floor(status / 100) === 2) {
        return;
      }

      if (!utils || !utils.autocomplete || !utils.autocomplete.lastResult) {
        // sanity check
        return;
      }

      const autocomplete = utils.autocomplete;

      // Now that we see a 404, let's compare to the cliqz results we provided
      autocomplete.lastResult._results.forEach((r) => {
        if (url === r.val) {
          const action = {
            type: 'performance',
            action: 'response',
            response_code: status,
            result_type: utils.encodeResultType(r.style || r.type),
            v: 1
          };
          utils.telemetry(action);
        }
      });
    }
  },

  addHttpObserver() {
    WebRequest.onHeadersReceived.addListener(CliqzRedirect.httpObserver.observeActivity, undefined, ['responseHeaders']);
  },

  removeHttpObserver() {
    WebRequest.onHeadersReceived.removeListener(CliqzRedirect.httpObserver.observeActivity, undefined, ['responseHeaders']);
  },

  unload() {
    CliqzRedirect.removeHttpObserver();
  }
};

export default CliqzRedirect;
