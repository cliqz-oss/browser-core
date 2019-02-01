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
import offersInResultsExtraOffers from '../../../core/integration/fixtures/offers/non-organic/offersInResultsExtraOffers';
import noOffersInResultsExtraOffers from '../../../core/integration/fixtures/offers/non-organic/noOffersInResultsExtraOffers';
import noResultsExtraOffers from '../../../core/integration/fixtures/offers/non-organic/noResultsExtraOffers';
import noResultsNoOffers from '../../../core/integration/fixtures/offers/non-organic/noResultsNoOffers';
import prefs from '../../../../core/prefs';

export default function () {
  context('non organic offers for different backend data', function () {
    let $offerElement;
    before(function () {
      prefs.set('myoffrz.experiments.001.style', 'plain');
      prefs.set('myoffrz.experiments.001.position', 'first');
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    describe('when offers come from both: results and offers field', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch(offersInResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        await waitForPopup(1);
        $offerElement = await $cliqzResults.querySelector('a.result:not(.search)');
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

      it('offer is shown only once', async function () {
        const $offerElements = await $cliqzResults
          .querySelectorAll('.result[href="https://www.happycar-test.de/?utm_source=cliqz&utm_medium=referral&utm_campaign=Cliqz_Camp1&utm_content=drpdwn"');
        expect($offerElements).to.have.length(1);
      });
    });

    describe('when offers come from only offers field', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch(noOffersInResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        await waitForPopup(2);
        $offerElement = await $cliqzResults.querySelector('a.result:not(.search)');
      });
      it('offer is rendered', function () {
        expect($offerElement).to.exist;
      });

      it('instant, offer and results are rendered', async function () {
        const $results = await $cliqzResults.querySelectorAll('a.result');
        expect($results).to.have.length(3);
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
        const $offerResults = await $cliqzResults
          .querySelectorAll('.result[href="https://www.mietwagen-happycar-test.de/?utm_source=cliqz&utm_medium=referral&utm_campaign=Cliqz_Camp1&utm_content=drpdwn"');
        expect($offerResults).to.have.length(1);
      });
    });

    describe('when offers come from only results', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch(noResultsExtraOffers);
        withHistory([]);
        fillIn('mietwagen');
        await waitForPopup(1);
        $offerElement = await $cliqzResults.querySelector('a.result:not(.search)');
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

      it('offer is shown only once', async function () {
        const $offerResults = await $cliqzResults
          .querySelectorAll('.result[href="https://www.happycar-test.de/?utm_source=cliqz&utm_medium=referral&utm_campaign=Cliqz_Camp1&utm_content=drpdwn"');
        expect($offerResults).to.have.length(1);
      });
    });

    describe('no results no offers', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch(noResultsNoOffers);
        withHistory([]);
        fillIn('mietwagen');
        await waitForPopup(0);
      });

      it('no results and no offers', async function () {
        const $allElements = await $cliqzResults.querySelectorAll('a.result:not(.search)');
        expect($allElements).to.have.length(0);
      });
    });
  });
}
