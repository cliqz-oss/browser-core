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
  checkParent,
  fillIn,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsNews';

export default function () {
  context('for news rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('bild');
      await waitForPopup(1);
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.news' });
    checkButtons({ $result: $cliqzResults, results });
  });
}
