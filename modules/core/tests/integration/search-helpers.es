/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  app,
  testServer,
  win,
} from '../test-helpers';

export { waitForPopup, $cliqzResults } from '../../../platform/test-helpers/helpers';

export async function mockSearch(response, timeout = 0) {
  await testServer.registerPathHandler('/api/v2/results', { result: JSON.stringify(response), timeout });
  app.settings.RESULTS_PROVIDER = testServer.getBaseUrl('/api/v2/results?nrh=1&q=');
}

export function withHistory(res, ms = 0) {
  win.CLIQZ.TestHelpers.historySearch.overrideHistorySearchHandler((q, cb) => {
    setTimeout(cb, ms, {
      query: q,
      results: res,
      ready: true,
    });
  });
}
