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
import offersResults from '../../../core/integration/fixtures/offers/non-organic/noOffersInResultsExtraOffers';

export default function () {
  context('keyboard navigation offer-non-organic', function () {
    const query = 'mietwag';
    const searchWithSelector = '.result.search';
    const offersSelector = `a.result[href="${offersResults.offers[0].snippet.extra.url_ad}"]`;
    const resultSelector = `a.result[href="${offersResults.results[0].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch(offersResults);
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
        const $offersElement = await $cliqzResults.querySelector(offersSelector);
        const $resultElement = await $cliqzResults.querySelector(resultSelector);
        return $searchWithElement && $offersElement && $resultElement;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(offersSelector,
          visibleValue(offersResults.offers[0].snippet.extra.url_ad)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(offersResults.results[0].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(searchWithSelector, query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(offersResults.results[0].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(offersSelector,
          visibleValue(offersResults.offers[0].snippet.extra.url_ad)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(searchWithSelector, query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(offersSelector,
          visibleValue(offersResults.offers[0].snippet.extra.url_ad)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(offersResults.results[0].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(searchWithSelector, query), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(resultSelector,
          visibleValue(offersResults.results[0].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(offersSelector,
          visibleValue(offersResults.offers[0].snippet.extra.url_ad)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(searchWithSelector, query), 600);
      });
    });
  });
}
