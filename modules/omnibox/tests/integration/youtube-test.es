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
  checkButtons,
  checkChildren,
  checkMainResult,
  checkParent,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsYoutube';

export default function () {
  context('for youtube rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('youtube');
      await waitForPopup(1);
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${results[0].url}"]`));
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.videos', youtube: true });
    checkButtons({ $result: $cliqzResults, results });
  });
}
