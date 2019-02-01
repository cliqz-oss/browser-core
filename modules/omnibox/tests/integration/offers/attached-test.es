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

import attachedOffers from '../../../core/integration/fixtures/offers/attached/attachedOffers';

export default function () {
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
        await blurUrlBar();
        await mockSearch(attachedOffers);
        withHistory([]);
        fillIn('hörenbuch audi');
        await waitForPopup(1);
        $offerElement = await $cliqzResults.querySelector('a.result:not(.search)');
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
      it('successfully', async function () {
        const offersAreaSelector = '.injected-offer';
        const $offersArea = await $cliqzResults.querySelector(offersAreaSelector);
        expect($offersArea).to.exist;
      });

      it('with title', async function () {
        const offersTitleSelector = '.offer-title';
        const $offersTitle = await $cliqzResults.querySelector(offersTitleSelector);
        expect($offersTitle).to.exist;
        expect($offersTitle).to.contain.text(attachedOffers.offers[0].snippet.title);
      });

      it('with description', async function () {
        const offersDescriptionSelector = '.offer-description';
        const $offersDescription = await $cliqzResults.querySelector(offersDescriptionSelector);
        expect($offersDescription).to.exist;
        expect($offersDescription).to.contain.text(attachedOffers.offers[0].snippet.description);
      });

      it('with friendly url', async function () {
        const urlSelector = '.offer-title';
        const $offersUrl = await $cliqzResults.querySelector(urlSelector);
        expect($offersUrl).to.exist;
        expect($offersUrl.getAttribute('data-url')).to.equal(attachedOffers.offers[0].url);
      });

      it('with "Anzeige"', async function () {
        const adSelector = '.ad-label';
        const $offerLabel = await $cliqzResults.querySelector(adSelector);
        expect($offerLabel).to.exist;
        expect($offerLabel.textContent.trim()).to.equal('Anzeige');
      });
    });
  });
}
