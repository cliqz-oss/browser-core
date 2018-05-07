import {
  blurUrlBar,
  $cliqzResults,
  fillIn,
  press,
  release,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import expectSelection from './common';
import { calcAndSimpleResults } from '../fixtures/resultsSimple';

export default function () {
  context('for calculator result', function () {
    let $resultElement;
    let $searchWithElement;
    const results = calcAndSimpleResults;
    const query = '2 + 2';
    const searchWithSelector = '.result.search';
    const calculatorSelector = '#calc-answer.result';
    const resultSelector = `a.result[data-url="${results[0].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      respondWith({ results: calcAndSimpleResults });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(searchWithSelector) &&
        $cliqzResults.querySelector(resultSelector) &&
        $cliqzResults.querySelector(calculatorSelector));
      $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
      $resultElement = $cliqzResults.querySelector(resultSelector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($resultElement, results[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($resultElement, results[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($resultElement, results[0].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($resultElement, results[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });
  });
}
