import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  testsEnabled,
  waitForPopup,
  win,
  withHistory,
} from '../helpers';

import attachedOffers from '../../../core/integration/fixtures/offers/attached/attachedOffers';

export default function () {
  if (!testsEnabled()) { return; }

  context('attached offers style', function () {
    let $offerElement;
    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });


    describe('renders main result', function () {
      before(async function () {
        blurUrlBar();
        await mockSearch(attachedOffers);
        withHistory([]);
        fillIn('hörenbuch audi');
        await waitForPopup(2);
        $offerElement = $cliqzResults.querySelector('a.result:not(.search)');
      });

      it('with title', function () {
        const titleSelector = '.title';
        expect($offerElement.querySelector(titleSelector)).to.exist;
        expect($offerElement.querySelector(titleSelector))
          .to.contain.text(attachedOffers.results[1].snippet.title);
      });

      it('with divider', function () {
        const dividerSelector = '.divider';
        expect($offerElement.querySelector(dividerSelector)).to.exist;
        expect($offerElement.querySelector(dividerSelector).textContent.trim()).to.equal('—');
      });

      it('with description', function () {
        const descriptionSelector = '.description';
        expect($offerElement.querySelector(descriptionSelector)).to.exist;
        expect($offerElement.querySelector(descriptionSelector).textContent.trim())
          .to.equal(attachedOffers.results[1].snippet.description);
      });

      it('with logo', function () {
        const logoSelector = '.icons span.logo';
        expect($offerElement.querySelector(logoSelector)).to.exist;
      });

      it('with correct url', function () {
        expect($offerElement.dataset.url).to
          .equal(attachedOffers.results[1].url);
      });
    });

    describe('renders attached offers element ', function () {
      it('successfully', function () {
        const offersAreaSelector = '.injected-offer';
        const $offersArea = $cliqzResults.querySelector(offersAreaSelector);
        expect($offersArea).to.exist;
      });


      it('with title', function () {
        const offersTitleSelector = '.offer-title';
        const $offersTitle = $cliqzResults.querySelector(offersTitleSelector);
        expect($offersTitle).to.exist;
        expect($cliqzResults.querySelector(offersTitleSelector))
          .to.contain.text(attachedOffers.offers[0].snippet.title);
      });

      it('with description', function () {
        const offersDescriptionSelector = '.offer-description';
        const $offersDescription = $cliqzResults.querySelector(offersDescriptionSelector);
        expect($offersDescription).to.exist;
        expect($cliqzResults.querySelector(offersDescriptionSelector))
          .to.contain.text(attachedOffers.offers[0].snippet.description);
      });

      it('with friendly url', function () {
        const urlSelector = '.offer-title';
        const $offersTitle = $cliqzResults.querySelector(urlSelector);
        expect($offersTitle).to.exist;
        expect($cliqzResults.querySelector(urlSelector)).to.exist;
        expect($offersTitle.getAttribute('data-url'))
          .to.equal(attachedOffers.offers[0].url);
      });

      it('with "Anzeige"', function () {
        const adSelector = '.ad-label';
        const $offerLabel = $cliqzResults.querySelector(adSelector);
        expect($offerLabel).to.exist;
        expect($cliqzResults.querySelector(adSelector).textContent.trim()).to.equal('Anzeige');
      });
    });
  });
}
