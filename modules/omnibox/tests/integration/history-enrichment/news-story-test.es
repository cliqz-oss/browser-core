/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';

import results from '../../../core/integration/fixtures/resultsNewsStoryOfTheDay';

export default function () {
  context('history enrichment for news story', function () {
    let $historyElement;
    const query = 'trump';
    const url = results[0].url;

    before(async function () {
      await blurUrlBar();
      withHistory([{ value: url }]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup(2);
      $historyElement = async () => {
        const $result = await $cliqzResults.querySelector(`.result[data-url="${url}"]`);
        return $result.closest('.history');
      };
    });

    it('renders SC news story only in history', async function () {
      await waitFor(async () => {
        const $history = await $historyElement();
        expect($history).to.exist;
        expect($history.querySelector(`.news-story .result[data-url="${url}"]`)).to.exist;
        return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      }, 600);
    });
  });
}
