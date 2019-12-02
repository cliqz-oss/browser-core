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
  press,
  release,
  urlbar,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import {
  expectSelection,
  visibleValue,
} from './common';
import { results, friendlyUrl } from '../../../core/integration/fixtures/resultsTwoSimple';

export default function () {
  context('keyboard navigation two results with autocomplete', function () {
    const query = 'ro';
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $result1Element = await $cliqzResults.querySelector(result1Selector);
        const $result2Element = await $cliqzResults.querySelector(result2Selector);
        const urlbarTextValue = await urlbar.textValue;
        return urlbarTextValue === friendlyUrl[results[0].url]
          && $result1Element
          && $result2Element;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    ['ArrowLeft', 'ArrowRight'].forEach((key) => {
      ['ArrowUp', 'ArrowDown'].forEach((key2) => {
        context(`first press ${key}`, function () {
          const expectedValue = friendlyUrl[results[0].url];
          const expectedCursorPosition = key === 'ArrowLeft'
            ? query.length
            : expectedValue.length;

          beforeEach(function () {
            press({ key });
            return waitFor(async () => {
              const start = await urlbar.selectionStart;
              const end = await urlbar.selectionEnd;
              return start === end;
            });
          });

          it('autocompleted friendlyUrl is in url bar', async function () {
            expect(await urlbar.textValue).to.equal(visibleValue(friendlyUrl[results[0].url]));
          });

          it('cursor is at the right place', async function () {
            expect(await urlbar.selectionStart).to.equal(expectedCursorPosition);
            expect(await urlbar.selectionEnd).to.equal(expectedCursorPosition);
          });

          it(`cursor is at the end of the query after pressing ${key2}`, async function () {
            press({ key: key2 });
            expect(await urlbar.selectionStart).to.equal(expectedValue.length);
            expect(await urlbar.selectionEnd).to.equal(expectedValue.length);
          });
        });
      });
    });
  });
}
