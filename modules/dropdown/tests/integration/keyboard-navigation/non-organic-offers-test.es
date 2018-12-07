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
import offersResults from '../../../core/integration/fixtures/offers/non-organic/noOffersInResultsExtraOffers';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation offer-non-organic', function () {
    let $searchWithElement;
    let $offersElement;
    let $resultElement;
    const query = 'mietwag';
    const searchWithSelector = '.result.search';
    const offersSelector = `a.result[href="${offersResults.offers[0].snippet.extra.url_ad}"]`;
    const resultSelector = `a.result[href="${offersResults.results[0].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch(offersResults);
      fillIn(query);
      await waitForPopup(3);
      await waitFor(() =>
        $cliqzResults.querySelector(searchWithSelector)
        && $cliqzResults.querySelector(offersSelector)
        && $cliqzResults.querySelector(resultSelector));
      $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
      $offersElement = $cliqzResults.querySelector(offersSelector);
      $resultElement = $cliqzResults.querySelector(resultSelector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($offersElement,
          offersResults.offers[0].snippet.extra.url_ad), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($resultElement,
          offersResults.results[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($resultElement,
          offersResults.results[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($offersElement,
          offersResults.offers[0].snippet.extra.url_ad), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($offersElement,
          offersResults.offers[0].snippet.extra.url_ad), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($resultElement,
          offersResults.results[0].url), 600);
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
        await waitFor(() => expectSelection($resultElement,
          offersResults.results[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($offersElement,
          offersResults.offers[0].snippet.extra.url_ad), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });
  });
}
