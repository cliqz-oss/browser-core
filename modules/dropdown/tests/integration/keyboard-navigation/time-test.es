import {
  blurUrlBar,
  $cliqzResults,
  fillIn,
  mockSearch,
  press,
  release,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import expectSelection from './common';
import timeResult from '../fixtures/resultsTime';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation time', function () {
    let $resultElement;
    let $searchWithElement;
    const url = 'https://test-time.com';
    const results = timeResult.concat([{ url }]);
    const query = 'time berlin';
    const searchWithSelector = 'a.result.search';
    const timeAreaSelector = '.cliqz-result .time';
    const resultSelector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(searchWithSelector) &&
        $cliqzResults.querySelector(resultSelector) &&
        $cliqzResults.querySelector(timeAreaSelector));
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
