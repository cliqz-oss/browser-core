import {
  blurUrlBar,
  $cliqzResults,
  fillIn,
  mockSearch,
  prefs,
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
import { notLocalResults } from '../../../core/integration/fixtures/resultsCinema';

export default function () {
  context('keyboard navigation cinema', function () {
    const url = 'https://test-cinema.com';
    const results = notLocalResults.concat([{ url }]);
    const query = 'yorck ';
    const searchWithSelector = 'a.result.search';
    const cinemaSelector = `a.result[data-url="${notLocalResults[0].url}"]`;
    const cinemaMapSelector = '.movie-cinema .padded';
    const cinemaTableTitleSelector = '.showtime-title';
    const cinemaTableSelector = '.show-time.padded';
    const resultSelector = `a.result[data-url="${results[1].url}"]`;

    context('with "never" share location settings', function () {
      beforeEach(async function () {
        await blurUrlBar();
        prefs.set('share_location', 'no');
        withHistory([]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup();
        await waitFor(async () => {
          const $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
          const $cinemaElement = await $cliqzResults.querySelector(cinemaSelector);
          const $resultElement = await $cliqzResults.querySelector(resultSelector);
          const $cinemaTable = await $cliqzResults.querySelector(cinemaTableSelector);
          const $cinemaTitle = await $cliqzResults.querySelector(cinemaTableTitleSelector);
          const $cinemaMap = await $cliqzResults.querySelector(cinemaMapSelector);
          return $searchWithElement && $cinemaElement && $resultElement
            && $cinemaTable && $cinemaTitle && $cinemaMap;
        });
      });

      context('navigate with arrowDown', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'ArrowDown' });
          await waitFor(() => expectSelection(cinemaSelector,
            visibleValue(results[0].url)), 600);
          press({ key: 'ArrowDown' });
          await waitFor(() => expectSelection(resultSelector,
            visibleValue(results[1].url)), 600);
          press({ key: 'ArrowDown' });
          await waitFor(() => expectSelection(searchWithSelector,
            query), 600);
        });
      });

      context('navigate with arrowUp', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'ArrowUp' });
          await waitFor(() => expectSelection(resultSelector,
            visibleValue(results[1].url)), 600);
          press({ key: 'ArrowUp' });
          await waitFor(() => expectSelection(cinemaSelector,
            visibleValue(results[0].url)), 600);
          press({ key: 'ArrowUp' });
          await waitFor(() => expectSelection(searchWithSelector,
            query), 600);
        });
      });

      context('navigate with Tab', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'Tab' });
          await waitFor(() => expectSelection(cinemaSelector,
            visibleValue(results[0].url)), 600);
          press({ key: 'Tab' });
          await waitFor(() => expectSelection(resultSelector,
            visibleValue(results[1].url)), 600);
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
          await waitFor(() => expectSelection(resultSelector,
            visibleValue(results[1].url)), 600);
          press({ key: 'Tab', shiftKey: true });
          await waitFor(() => expectSelection(cinemaSelector,
            visibleValue(results[0].url)), 600);
          press({ key: 'Tab', shiftKey: true });
          await waitFor(() => expectSelection(searchWithSelector,
            query), 600);
        });
      });
    });

    context('with "always" share location settings', function () {
      beforeEach(async function () {
        await blurUrlBar();
        prefs.set('share_location', 'yes');
        withHistory([]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup();
        await waitFor(async () => {
          const $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
          const $cinemaElement = await $cliqzResults.querySelector(cinemaSelector);
          const $resultElement = await $cliqzResults.querySelector(resultSelector);
          const $cinemaTable = await $cliqzResults.querySelector(cinemaTableSelector);
          const $cinemaTitle = await $cliqzResults.querySelector(cinemaTableTitleSelector);
          const $cinemaMap = await $cliqzResults.querySelector(cinemaMapSelector);
          return $searchWithElement && $cinemaElement && $resultElement
            && $cinemaTable && $cinemaTitle && $cinemaMap;
        });
      });

      context('navigate with arrowDown', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'ArrowDown' });
          await waitFor(() => expectSelection(cinemaSelector,
            visibleValue(results[0].url)), 600);
          press({ key: 'ArrowDown' });
          await waitFor(() => expectSelection(resultSelector,
            visibleValue(results[1].url)), 600);
          press({ key: 'ArrowDown' });
          await waitFor(() => expectSelection(searchWithSelector,
            query), 600);
        });
      });

      context('navigate with arrowUp', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'ArrowUp' });
          await waitFor(() => expectSelection(resultSelector,
            visibleValue(results[1].url)), 600);
          press({ key: 'ArrowUp' });
          await waitFor(() => expectSelection(cinemaSelector,
            visibleValue(results[0].url)), 600);
          press({ key: 'ArrowUp' });
          await waitFor(() => expectSelection(searchWithSelector,
            query), 600);
        });
      });

      context('navigate with Tab', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'Tab' });
          await waitFor(() => expectSelection(cinemaSelector,
            visibleValue(results[0].url)), 600);
          press({ key: 'Tab' });
          await waitFor(() => expectSelection(resultSelector,
            visibleValue(results[1].url)), 600);
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
          await waitFor(() => expectSelection(resultSelector,
            visibleValue(results[1].url)), 600);
          press({ key: 'Tab', shiftKey: true });
          await waitFor(() => expectSelection(cinemaSelector,
            visibleValue(results[0].url)), 600);
          press({ key: 'Tab', shiftKey: true });
          await waitFor(() => expectSelection(searchWithSelector,
            query), 600);
        });
      });
    });
  });
}
