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
import results from '../fixtures/resultsNewsStoryOfTheDay';

export default function () {
  context('for news story of the day', function () {
    let $searchWithElement;
    let $newsElement;
    const query = 'donald trump';
    const searchWithSelector = '.result.search';
    const newsSelector = `.news-story .result[data-url="${results[0].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(searchWithSelector) &&
        $cliqzResults.querySelector(newsSelector));
      $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
      $newsElement = $cliqzResults.querySelector(newsSelector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($newsElement, results[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($newsElement, results[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($newsElement, results[0].url), 600);
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
        await waitFor(() => expectSelection($newsElement, results[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });
  });
}
