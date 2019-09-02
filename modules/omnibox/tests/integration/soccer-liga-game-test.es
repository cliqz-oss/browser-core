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
  checkMainResult,
  checkParent,
  checkSoccerLigaGame,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
  dropdownClick,
} from './helpers';
import results from '../../core/integration/fixtures/resultsSoccerLigaGame';

export default function () {
  context('for soccer liga game results', function () {
    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('(UI)', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('fc bayern');
        await waitForPopup(1);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkButtons({ $result: $cliqzResults, results });
      checkSoccerLigaGame({ $result: $cliqzResults, results });
    });

    context('(interactions) after clicking on the "Show more" button', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('FC Bayer München');
        await waitForPopup(1);
        await dropdownClick('.result.expand-btn');
        await waitFor(async () => {
          const tableRows = await $cliqzResults.querySelectorAll('.table-row');
          return tableRows !== 2;
        });
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkButtons({ $result: $cliqzResults, results });
      checkSoccerLigaGame({ $result: $cliqzResults, results, isExpanded: true });
    });
  });
}
