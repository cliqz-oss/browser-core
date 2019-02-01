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
import { soccerResults } from '../../../core/integration/fixtures/resultsSoccerLigaGame';

export default function () {
  context('keyboard navigation soccer liga game', function () {
    const results = soccerResults;
    const query = 'fcbayern';
    const resultSelector = `a.result[data-url="${results[0].url}"]`;
    const titleSelector = '.result.soccer-title';
    const soccerSelector = '.padded .soccer';
    const news1Selector = `a.result[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const news2Selector = `a.result[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $resultElement = await $cliqzResults.querySelector(resultSelector);
        const $titleElement = await $cliqzResults.querySelector(titleSelector);
        const $news1Element = await $cliqzResults.querySelector(news1Selector);
        const $news2Element = await $cliqzResults.querySelector(news2Selector);
        const $soccerElement = await $cliqzResults.querySelector(soccerSelector);
        return $resultElement && $titleElement && $news1Element && $news2Element && $soccerElement;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(titleSelector,
          visibleValue(results[0].snippet.extra.url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(news1Selector,
          visibleValue(results[0].snippet.deepResults[0].links[0].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(news2Selector,
          visibleValue(results[0].snippet.deepResults[0].links[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].snippet.friendlyUrl)), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(news2Selector,
          visibleValue(results[0].snippet.deepResults[0].links[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(news1Selector,
          visibleValue(results[0].snippet.deepResults[0].links[0].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(titleSelector,
          visibleValue(results[0].snippet.extra.url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].snippet.friendlyUrl)), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(titleSelector,
          visibleValue(results[0].snippet.extra.url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(news1Selector,
          visibleValue(results[0].snippet.deepResults[0].links[0].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(news2Selector,
          visibleValue(results[0].snippet.deepResults[0].links[1].url)), 600);
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
        await waitFor(() => expectSelection(news2Selector,
          visibleValue(results[0].snippet.deepResults[0].links[1].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(news1Selector,
          visibleValue(results[0].snippet.deepResults[0].links[0].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(titleSelector,
          visibleValue(results[0].snippet.extra.url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].snippet.friendlyUrl)), 600);
      });
    });
  });
}
