import {
  blurUrlBar,
  $cliqzResults,
  fillIn,
  press,
  release,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory
} from '../helpers';
import expectSelection from './common';
import { bmWithRichData } from '../fixtures/resultsBigMachineRichData';

export default function () {
  context('for bm results with rich data', function () {
    let $result1Element;
    let $result2Element;
    const results = bmWithRichData;
    const query = 'github';
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(result1Selector) &&
        $cliqzResults.querySelector(result2Selector) &&
        $cliqzResults.querySelectorAll('.anchors .result').length === 4);
      $result1Element = $cliqzResults.querySelector(result1Selector);
      $result2Element = $cliqzResults.querySelector(result2Selector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($result2Element, results[1].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($result2Element, results[1].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($result2Element, results[1].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($result2Element, results[1].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
      });
    });
  });
}
