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
  fillIn,
  mockSearch,
  press,
  release,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import {
  expectSelection,
  visibleValue,
} from './common';
import timeResult from '../../../core/integration/fixtures/resultsTime';

export default function () {
  context('keyboard navigation time', function () {
    const url = 'https://test-time.com';
    const results = timeResult.concat([{ url }]);
    const query = 'time berlin';
    const searchWithSelector = 'a.result.search';
    const timeAreaSelector = '.cliqz-result .time';
    const resultSelector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
        const $resultElement = await $cliqzResults.querySelector(resultSelector);
        const $timeElement = await $cliqzResults.querySelector(timeAreaSelector);
        return $searchWithElement && $resultElement && $timeElement;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });
  });
}
