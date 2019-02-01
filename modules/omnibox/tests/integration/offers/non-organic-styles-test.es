import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from '../helpers';

import noOffersInResultsExtraOffers from '../../../core/integration/fixtures/offers/non-organic/noOffersInResultsExtraOffers';

export default function () {
  context('non organic offers with different position', function () {
    let $offerElement;
    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    describe('when offers have first position', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch(noOffersInResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        await waitForPopup(2);
        $offerElement = await $cliqzResults.querySelector('a.result:not(.search)');
      });

      it('renders title', function () {
        const titleSelector = '.title';
        expect($offerElement.querySelector(titleSelector)).to.exist;
        expect($offerElement.querySelector(titleSelector))
          .to.contain.text(noOffersInResultsExtraOffers.offers[0].snippet.title);
      });

      it('renders divider', function () {
        const dividerSelector = '.divider';
        expect($offerElement.querySelector(dividerSelector)).to.exist;
        expect($offerElement.querySelector(dividerSelector).textContent.trim()).to.equal('—');
      });

      it('renders friendly url', function () {
        const urlSelector = '.url';
        expect($offerElement.querySelector(urlSelector)).to.exist;
        expect($offerElement.querySelector(urlSelector).textContent.trim())
          .to.equal(noOffersInResultsExtraOffers.offers[0].snippet.friendlyUrl);
      });

      it('renders description', function () {
        const descriptionSelector = '.description';
        expect($offerElement.querySelector(descriptionSelector)).to.exist;
        expect($offerElement.querySelector(descriptionSelector).textContent.trim())
          .to.equal(noOffersInResultsExtraOffers.offers[0].snippet.description);
      });

      it('renders "Anzeige"', function () {
        const adSelector = '.ad';
        expect($offerElement.querySelector(adSelector)).to.exist;
        expect($offerElement.querySelector(adSelector).textContent.trim()).to.equal('Anzeige');
      });

      it('renders logo', function () {
        const logoSelector = '.icons span.logo';
        expect($offerElement.querySelector(logoSelector)).to.exist;
      });

      it('renders result with correct url', function () {
        expect($offerElement.dataset.url).to
          .equal(noOffersInResultsExtraOffers.offers[0].snippet.extra.url_ad);
      });

      it('offer is shown only once', async function () {
        const offerSelector = await $cliqzResults
          .querySelectorAll(`.result[href="${noOffersInResultsExtraOffers.offers[0].snippet.extra.url_ad}"`);
        expect(offerSelector).to.have.length(1);
      });
    });

    describe('when offers have second position', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch(noOffersInResultsExtraOffers);
        withHistory([]);
        fillIn('billiger');
        await waitForPopup(2);
      });

      it('normal result is rendered in first position', async function () {
        const $results = await $cliqzResults.querySelectorAll('.result');
        expect($results[0].href).to.equal(noOffersInResultsExtraOffers.results[0].url);
      });

      it('offer is rendered in second position', async function () {
        const $results = await $cliqzResults.querySelectorAll('.result');
        expect($results[1].href)
          .to.equal(noOffersInResultsExtraOffers.offers[0].snippet.extra.url_ad);
      });
    });
  });
}
