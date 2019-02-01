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
import offersResults from '../../../core/integration/fixtures/offers/attached/attachedOffers';

export default function () {
  context('keyboard navigation attached offers', function () {
    const query = 'hörenbuch audi';
    const attachedOfferSelector = '.injected-offer';
    const searchWithSelector = '.result.search';
    const offersSelector = `a.result[data-url="${offersResults.results[1].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch(offersResults);
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
        const $offersElement = await $cliqzResults.querySelector(offersSelector);
        const $attachedOffer = await $cliqzResults.querySelector(attachedOfferSelector);
        return $searchWithElement && $offersElement && $attachedOffer;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(offersSelector,
          visibleValue(offersResults.results[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(offersSelector,
          visibleValue(offersResults.results[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(offersSelector,
          visibleValue(offersResults.results[1].url)), 600);
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
        await waitFor(() => expectSelection(offersSelector,
          visibleValue(offersResults.results[1].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });
  });
}
