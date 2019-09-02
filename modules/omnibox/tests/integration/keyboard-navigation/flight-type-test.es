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
  waitForPopup,
  waitFor,
  withHistory,
} from '../helpers';
import {
  expectSelection,
  visibleValue,
} from './common';
import { flightAndNormalResult } from '../../../core/integration/fixtures/resultsFlights';

export default function () {
  context('keyboard navigation flight type', function () {
    const results = flightAndNormalResult;
    const query = 'flug lx3029';
    const searchWithSelector = 'a.result.search';
    const flightAreaSelector = '.result.instant .flight-details';
    const resultSelector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results: flightAndNormalResult });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
        const $resultElement = await $cliqzResults.querySelector(resultSelector);
        const $flightElement = await $cliqzResults.querySelector(flightAreaSelector);
        return $searchWithElement && $resultElement && $flightElement;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(searchWithSelector, query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(searchWithSelector, query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(searchWithSelector, query), 600);
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
        await waitFor(() => expectSelection(searchWithSelector, query), 600);
      });
    });
  });
}
