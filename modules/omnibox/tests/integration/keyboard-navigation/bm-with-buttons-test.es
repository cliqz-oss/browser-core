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
import { expectSelection } from './common';
import { bmWithButtons } from '../../../core/integration/fixtures/resultsBigMachineWithButtons';
import { strip } from '../../../../core/url';

function stripProtocol(url) {
  return strip(url, {
    spaces: true,
    protocol: true,
    www: true,
    mobile: true,
    trailingSlash: true,
  });
}

export default function () {
  context('keyboard navigation bm results with buttons', function () {
    const results = bmWithButtons;
    const query = 'google';
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;
    const button1Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const button2Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;
    const button3Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[2].url}"]`;
    const button4Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[3].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $result1Element = await $cliqzResults.querySelector(result1Selector);
        const $result2Element = await $cliqzResults.querySelector(result2Selector);
        const $buttons = await $cliqzResults.querySelectorAll('.result.btn');
        return $buttons.length === 4 && $result1Element && $result2Element;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          button1Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[0].url),
        ), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          button2Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[1].url),
        ), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          button3Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[2].url),
        ), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          button4Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[3].url),
        ), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          result2Selector,
          results[1].snippet.friendlyUrl,
        ), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          result2Selector,
          stripProtocol(results[1].snippet.friendlyUrl),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          button4Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[3].url),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          button3Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[2].url),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          button2Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[1].url),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          button1Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[0].url),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          result1Selector,
          results[0].snippet.friendlyUrl,
        ), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          button1Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[0].url),
        ), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          button2Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[1].url),
        ), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          button3Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[2].url),
        ), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          button4Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[3].url),
        ), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          result2Selector,
          results[1].snippet.friendlyUrl,
        ), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          result2Selector,
          results[1].snippet.friendlyUrl,
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          button4Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[3].url),
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          button3Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[2].url),
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          button2Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[1].url),
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          button1Selector,
          stripProtocol(results[0].snippet.deepResults[0].links[0].url),
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          result1Selector,
          results[0].snippet.friendlyUrl,
        ), 600);
      });
    });
  });
}
