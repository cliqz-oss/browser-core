import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  testsEnabled,
  waitForPopup,
  withHistory } from '../helpers';

import noOffersInResultsExtraOffers from '../fixtures/offers/non-organic/noOffersInResultsExtraOffers';
import prefs from '../../../../core/prefs';

export default function () {
  if (!testsEnabled()) { return; }

  context('non organic offers with different position', function () {
    let $offerElement;
    before(function () {
      window.preventRestarts = true;
      prefs.set('offersDropdownSwitch', true);
    });

    after(function () {
      window.preventRestarts = false;
    });

    describe('when offers have first position', function () {
      before(async function () {
        blurUrlBar();
        await mockSearch(noOffersInResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        await waitForPopup(3);
        $offerElement = $cliqzResults.querySelector('a.result:not(.search)');
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

      it('offer is shown only once', function () {
        const offerSelector = $cliqzResults.querySelectorAll(`.result[href="${noOffersInResultsExtraOffers.offers[0].snippet.extra.url_ad}"`);
        expect(offerSelector).to.have.length(1);
      });
    });

    describe('when offers have second position', function () {
      before(async function () {
        blurUrlBar();
        await mockSearch(noOffersInResultsExtraOffers);
        withHistory([]);
        fillIn('billiger');
        await waitForPopup(2);
      });

      it('normal result is rendered in first position', function () {
        expect($cliqzResults.querySelectorAll('.result')[0].href).to.equal(noOffersInResultsExtraOffers.results[0].url);
      });

      it('offer is rendered in second position', function () {
        expect($cliqzResults.querySelectorAll('.result')[1].href).to.equal(noOffersInResultsExtraOffers.offers[0].snippet.extra.url_ad);
      });
    });
  });
}
