/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  $cliqzResults,
  blurUrlBar,
  checkhistoryResult,
  fillIn,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsHistoryAndNews';
import historyResults from '../../core/integration/fixtures/historyResultsHistoryAndNews';

export default function () {
  context('for history and news rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory(historyResults);
      fillIn('cliqz');
      await waitForPopup(4);
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkhistoryResult({
      $result: $cliqzResults,
      historyResults,
      isPresent: true
    });
  });
}
