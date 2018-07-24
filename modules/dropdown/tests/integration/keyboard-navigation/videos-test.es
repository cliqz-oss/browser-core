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
import { videosResults } from '../fixtures/resultsYoutube';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation videos', function () {
    let $resultElement;
    let $video1Element;
    let $video2Element;
    let $video3Element;
    const results = videosResults;
    const query = 'youtube';
    const resultSelector = `a.result[data-url="${results[0].url}"]`;
    const video1Selector = `.videos .result[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const video2Selector = `.videos .result[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;
    const video3Selector = `.videos .result[data-url="${results[0].snippet.deepResults[0].links[2].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(resultSelector) &&
        $cliqzResults.querySelectorAll('.videos .result').length === 3);
      $resultElement = $cliqzResults.querySelector(resultSelector);
      $video1Element = $cliqzResults.querySelector(video1Selector);
      $video2Element = $cliqzResults.querySelector(video2Selector);
      $video3Element = $cliqzResults.querySelector(video3Selector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($video1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($video2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($video3Element,
          results[0].snippet.deepResults[0].links[2].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($video3Element,
          results[0].snippet.deepResults[0].links[2].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($video2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($video1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($video1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($video2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($video3Element,
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
        await waitFor(() => expectSelection($video3Element,
          results[0].snippet.deepResults[0].links[2].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($video2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($video1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });
  });
}
