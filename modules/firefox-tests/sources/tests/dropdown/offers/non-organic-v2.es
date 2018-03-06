import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from '../helpers';
import offersInResultsExtraOffers from '../fixtures/offers/non-organic/offersInResultsExtraOffers';
import noOffersInResultsExtraOffers from '../fixtures/offers/non-organic/noOffersInResultsExtraOffers';
import noResultsExtraOffers from '../fixtures/offers/non-organic/noResultsExtraOffers';
import noResultsNoOffers from '../fixtures/offers/non-organic/noResultsNoOffers';

export default function () {
  context('non organic offers', function () {
    let $resultElement;
    let offerElement;

    describe('offers both in results and in offers field', function () {
      before(function () {
        CliqzUtils.setPref('offersDropdownSwitch', true);
        respondWith(offersInResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          offerElement = $resultElement.querySelector('a.result:not(.search)');
        });
      });

      it('renders title', function () {
        const titleSelector = '.title';
        expect(offerElement).to.contain(titleSelector);
      });

      it('renders divider', function () {
        const dividerSelector = '.divider';
        expect(offerElement).to.contain(dividerSelector);
        expect(offerElement.querySelector(dividerSelector).textContent.trim()).to.equal('—');
      });

      it('renders url', function () {
        const urlSelector = '.url';
        expect(offerElement).to.contain(urlSelector);
        expect(offerElement.querySelector(urlSelector).textContent.trim())
          .to.equal(offersInResultsExtraOffers.results[0].snippet.friendlyUrl);
      });

      it('renders description', function () {
        const descriptionSelector = '.description';
        expect(offerElement).to.contain(descriptionSelector);
        expect(offerElement.querySelector(descriptionSelector).textContent.trim())
          .to.equal(offersInResultsExtraOffers.results[0].snippet.description);
      });

      it('renders "Anzeige"', function () {
        const adSelector = '.ad';
        expect(offerElement).to.contain(adSelector);
        expect(offerElement.querySelector(adSelector).textContent.trim()).to.equal('Anzeige');
      });

      it('renders logo', function () {
        const logoSelector = ".icons span[class='logo']";
        expect($resultElement).to.contain(logoSelector);
      });

      it('url is correct', function () {
        expect(offerElement.dataset.url).to
          .equal(offersInResultsExtraOffers.results[0].snippet.extra.url_ad);
      });

      it('offer is shown only once', function () {
        const offerSelector = $resultElement.querySelectorAll('.result[href="https://www.happycar.de/?utm_source=cliqz&utm_medium=referral&utm_campaign=Cliqz_Camp1&utm_content=drpdwn"');
        expect(offerSelector.length).equal(1);
      });
    });

    describe('offers only in offers field', function () {
      before(function () {
        CliqzUtils.setPref('offersDropdownSwitch', true);
        respondWith(noOffersInResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          offerElement = $resultElement.querySelector('.ad');
        });
      });

      it('offer is rendered', function () {
        expect(offerElement).to.exist;
      });

      it('instant, offer and results are rendered', function () {
        const $results = $cliqzResults()[0];
        expect($results.children.length).to.equal(3);
      });
    });

    describe('only offers no results', function () {
      before(function () {
        CliqzUtils.setPref('offersDropdownSwitch', true);
        respondWith(noResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          offerElement = $resultElement.querySelector('a.result:not(.search');
        });
      });

      it('offer is rendered', function () {
        expect(offerElement).to.exist;
      });
    });

    describe('no results no offers', function () {
      before(function () {
        CliqzUtils.setPref('offersDropdownSwitch', true);
        respondWith(noResultsNoOffers);
        withHistory([]);
        fillIn('mietwagen');
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        });
      });

      it('no results and no offers', function () {
        const allElements = $resultElement.querySelectorAll('a.result:not(.search');
        expect(allElements.length).to.equal(0);
      });

      // TODO test suggestions
    });
  });
}

