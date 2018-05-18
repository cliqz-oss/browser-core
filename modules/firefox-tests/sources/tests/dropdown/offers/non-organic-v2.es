import {
  blurUrlBar,
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
  context('non organic offers for different backend data', function () {
    let $offerElement;
    before(function () {
      CliqzUtils.setPref('offersDropdownSwitch', true);
      CliqzUtils.setPref('myoffrz.experiments.001.style', 'plain');
      CliqzUtils.setPref('myoffrz.experiments.001.position', 'first');
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    describe('when offers come from both: results and offers field', function () {
      before(async function () {
        blurUrlBar();
        CliqzUtils.setPref('offersDropdownSwitch', true);
        respondWith(offersInResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        await waitForPopup(2);
        $offerElement = $cliqzResults.querySelector('a.result:not(.search)');
      });

      it('offer is rendered', function () {
        expect($offerElement).to.exist;
      });

      it('renders title', function () {
        const titleSelector = '.title';
        expect($offerElement.querySelector(titleSelector)).to.exist;
        expect($offerElement.querySelector(titleSelector))
          .to.contain.text(offersInResultsExtraOffers.results[0].snippet.title);
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
          .to.equal(offersInResultsExtraOffers.results[0].snippet.friendlyUrl);
      });

      it('renders description', function () {
        const descriptionSelector = '.description';
        expect($offerElement.querySelector(descriptionSelector)).to.exist;
        expect($offerElement.querySelector(descriptionSelector).textContent.trim())
          .to.equal(offersInResultsExtraOffers.results[0].snippet.description);
      });

      it('renders "Anzeige"', function () {
        const adSelector = '.ad';
        expect($offerElement.querySelector(adSelector)).to.exist;
        expect($offerElement.querySelector(adSelector).textContent.trim()).to.equal('Anzeige');
      });

      it('renders logo', function () {
        const logoSelector = '.icons .logo';
        expect($offerElement.querySelector(logoSelector)).to.exist;
      });

      it('render result with correct url', function () {
        expect($offerElement.href).to
          .equal(offersInResultsExtraOffers.results[0].snippet.extra.url_ad);
      });

      it('offer is shown only once', function () {
        const offerSelector = $cliqzResults.querySelectorAll('.result[href="https://www.happycar.de/?utm_source=cliqz&utm_medium=referral&utm_campaign=Cliqz_Camp1&utm_content=drpdwn"');
        expect(offerSelector.length).equal(1);
      });
    });

    describe('when offers come from only offers field', function () {
      before(function () {
        blurUrlBar();
        CliqzUtils.setPref('offersDropdownSwitch', true);
        respondWith(noOffersInResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        return waitForPopup(3).then(function () {
          $offerElement = $cliqzResults.querySelector('a.result:not(.search)');
        });
      });
      it('offer is rendered', function () {
        expect($offerElement).to.exist;
      });

      it('instant, offer and results are rendered', function () {
        expect($cliqzResults.querySelectorAll('a.result').length).to.equal(3);
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
        const offerSelector = $cliqzResults.querySelectorAll('.result[href="https://www.happycar.de/?utm_source=cliqz&utm_medium=referral&utm_campaign=Cliqz_Camp1&utm_content=drpdwn"');
        expect(offerSelector.length).equal(1);
      });
    });

    describe('when offers come from only results', function () {
      before(function () {
        blurUrlBar();
        CliqzUtils.setPref('offersDropdownSwitch', true);
        respondWith(noResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        return waitForPopup(2).then(function () {
          $offerElement = $cliqzResults.querySelector('a.result:not(.search)');
        });
      });

      it('offer is rendered', function () {
        expect($offerElement).to.exist;
      });

      it('renders title', function () {
        const titleSelector = '.title';
        expect($offerElement.querySelector(titleSelector)).to.exist;
        expect($offerElement.querySelector(titleSelector))
          .to.contain.text(noResultsExtraOffers.offers[0].snippet.title);
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
          .to.equal(noResultsExtraOffers.offers[0].snippet.friendlyUrl);
      });

      it('renders description', function () {
        const descriptionSelector = '.description';
        expect($offerElement.querySelector(descriptionSelector)).to.exist;
        expect($offerElement.querySelector(descriptionSelector).textContent.trim())
          .to.equal(noResultsExtraOffers.offers[0].snippet.description);
      });

      it('renders "Anzeige"', function () {
        const adSelector = '.ad';
        expect($offerElement.querySelector(adSelector)).to.exist;
        expect($offerElement.querySelector(adSelector).textContent.trim()).to.equal('Anzeige');
      });

      it('renders logo', function () {
        const logoSelector = 'a.result:not(.search) .icons span.logo';
        expect($offerElement.querySelector(logoSelector)).to.exist;
      });

      it('renders result with correct url', function () {
        expect($offerElement.href).to
          .equal(noResultsExtraOffers.offers[0].snippet.extra.url_ad);
      });

      it('offer is shown only once', function () {
        const offerSelector = $cliqzResults.querySelectorAll('.result[href="https://www.happycar.de/?utm_source=cliqz&utm_medium=referral&utm_campaign=Cliqz_Camp1&utm_content=drpdwn"');
        expect(offerSelector.length).equal(1);
      });
    });

    describe('no results no offers', function () {
      before(function () {
        blurUrlBar();
        CliqzUtils.setPref('offersDropdownSwitch', true);
        respondWith(noResultsNoOffers);
        withHistory([]);
        fillIn('mietwagen');
        return waitForPopup(1);
      });

      it('no results and no offers', function () {
        const allElements = $cliqzResults.querySelectorAll('a.result:not(.search');
        expect(allElements.length).to.equal(0);
      });

      // TODO test suggestions
    });
  });
}
