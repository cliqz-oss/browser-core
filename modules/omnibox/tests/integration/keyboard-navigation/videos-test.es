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
import {
  expectSelection,
  visibleValue,
} from './common';
import { videosResults } from '../../../core/integration/fixtures/resultsYoutube';

export default function () {
  context('keyboard navigation videos', function () {
    const results = videosResults;
    const query = 'youtube';
    const resultSelector = `a.result[data-url="${results[0].url}"]`;
    const video1Selector = `.videos .result[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const video2Selector = `.videos .result[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;
    const video3Selector = `.videos .result[data-url="${results[0].snippet.deepResults[0].links[2].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $resultElement = await $cliqzResults.querySelector(resultSelector);
        const $video1Element = await $cliqzResults.querySelector(video1Selector);
        const $video2Element = await $cliqzResults.querySelector(video2Selector);
        const $video3Element = await $cliqzResults.querySelector(video3Selector);
        return $resultElement && $video1Element && $video2Element && $video3Element;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(video1Selector,
          visibleValue(results[0].snippet.deepResults[0].links[0].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(video2Selector,
          visibleValue(results[0].snippet.deepResults[0].links[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(video3Selector,
          visibleValue(results[0].snippet.deepResults[0].links[2].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].snippet.friendlyUrl)), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(video3Selector,
          visibleValue(results[0].snippet.deepResults[0].links[2].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(video2Selector,
          visibleValue(results[0].snippet.deepResults[0].links[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(video1Selector,
          visibleValue(results[0].snippet.deepResults[0].links[0].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].snippet.friendlyUrl)), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(video1Selector,
          visibleValue(results[0].snippet.deepResults[0].links[0].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(video2Selector,
          visibleValue(results[0].snippet.deepResults[0].links[1].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(video3Selector,
          visibleValue(results[0].snippet.deepResults[0].links[2].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].snippet.friendlyUrl)), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(video3Selector,
          visibleValue(results[0].snippet.deepResults[0].links[2].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(video2Selector,
          visibleValue(results[0].snippet.deepResults[0].links[1].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(video1Selector,
          visibleValue(results[0].snippet.deepResults[0].links[0].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].snippet.friendlyUrl)), 600);
      });
    });
  });
}
