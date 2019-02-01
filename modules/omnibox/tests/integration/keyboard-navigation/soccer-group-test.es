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
import results from '../../../core/integration/fixtures/resultsSoccerLigaGroup';

export default function () {
  context('keyboard navigation soccer liga group', function () {
    const query = 'uefa league';
    const searchWithSelector = '.result.search';
    const resultSelector = `a.result[data-url="${results[0].url}"]`;
    const titleSelector = '.result.soccer-title';
    const soccerSelector = '.padded .soccer';

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
        const $resultElement = await $cliqzResults.querySelector(resultSelector);
        const $titleElement = await $cliqzResults.querySelector(titleSelector);
        const $soccerElement = await $cliqzResults.querySelector(soccerSelector);
        return $searchWithElement && $resultElement && $titleElement && $soccerElement;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(titleSelector,
          visibleValue(results[0].snippet.extra.url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(titleSelector,
          visibleValue(results[0].snippet.extra.url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(titleSelector,
          visibleValue(results[0].snippet.extra.url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(titleSelector,
          visibleValue(results[0].snippet.extra.url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(results[0].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });
  });
}
