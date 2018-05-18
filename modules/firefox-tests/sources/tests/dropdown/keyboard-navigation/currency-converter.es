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
import { currencyAndSimpleResults } from '../fixtures/resultsCurrencyConverter';

export default function () {
  context('for currency converter result', function () {
    const results = currencyAndSimpleResults;
    let $resultElement;
    let $searchWithElement;
    const query = '1 euro in usd';
    const searchWithSelector = '.result.search';
    const currencySelector = '.currency';
    const resultSelector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      respondWith({ results: currencyAndSimpleResults });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(searchWithSelector) &&
        $cliqzResults.querySelector(resultSelector) &&
        $cliqzResults.querySelector(currencySelector));
      $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
      $resultElement = $cliqzResults.querySelector(resultSelector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($resultElement, results[1].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($resultElement, results[1].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($resultElement, results[1].url), 600);
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
        await waitFor(() => expectSelection($resultElement, results[1].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });
  });
}
