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
  withHistory,
} from '../helpers';
import expectSelection from './common';
import { newsResults } from '../../../core/integration/fixtures/resultsNews';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation news', function () {
    let $resultElement;
    let $news1Element;
    let $news2Element;
    let $news3Element;
    const results = newsResults;
    const query = 'bild';
    const resultSelector = `a.result[data-url="${results[0].url}"]`;
    const news1Selector = `.news a.result[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const news2Selector = `.news a.result[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;
    const news3Selector = `.news a.result[data-url="${results[0].snippet.deepResults[0].links[2].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(resultSelector)
        && $cliqzResults.querySelectorAll('.news .result').length === 3);
      $resultElement = $cliqzResults.querySelector(resultSelector);
      $news1Element = $cliqzResults.querySelector(news1Selector);
      $news2Element = $cliqzResults.querySelector(news2Selector);
      $news3Element = $cliqzResults.querySelector(news3Selector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($news1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($news2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($news3Element,
          results[0].snippet.deepResults[0].links[2].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($news3Element,
          results[0].snippet.deepResults[0].links[2].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($news2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($news1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($news1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($news2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($news3Element,
          results[0].snippet.deepResults[0].links[2].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($news3Element,
          results[0].snippet.deepResults[0].links[2].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($news2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($news1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });
  });
}
