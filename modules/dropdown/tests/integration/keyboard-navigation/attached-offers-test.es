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
import offersResults from '../../../core/integration/fixtures/offers/attached/attachedOffers';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation attached offers', function () {
    let $searchWithElement;
    let $offersElement;
    const query = 'hörenbuch audi';
    const attachedOfferSelector = '.injected-offer';
    const searchWithSelector = '.result.search';
    const offersSelector = `a.result[data-url="${offersResults.results[1].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch(offersResults);
      fillIn(query);
      await waitForPopup(2);
      await waitFor(() =>
        $cliqzResults.querySelector(searchWithSelector)
        && $cliqzResults.querySelector(offersSelector)
        && $cliqzResults.querySelector(attachedOfferSelector));
      $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
      $offersElement = $cliqzResults.querySelector(offersSelector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($offersElement,
          offersResults.results[1].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($offersElement,
          offersResults.results[1].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($offersElement,
          offersResults.results[1].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($offersElement,
          offersResults.results[1].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });
  });
}
