import { isWebExtension } from '../../../core/platform';
import {
  app,
  CliqzUtils,
  testServer,
} from '../test-helpers';

export { waitForPopup, $cliqzResults } from '../../../platform/test-helpers/helpers';

export async function mockSearch(response, timeout = 0) {
  await testServer.registerPathHandler('/api/v2/results', { result: JSON.stringify(response), timeout });
  app.settings.RESULTS_PROVIDER = testServer.getBaseUrl('/api/v2/results?nrh=1&q=');
}

export function testsEnabled() {
  return !isWebExtension;
}

export function withHistory(res, ms = 0) {
  CliqzUtils.historySearch = function (q, cb) {
    setTimeout(cb, ms, {
      query: q,
      results: res,
      ready: true,
    });
  };
}
