/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsOffers';

export default function () {
  context('offers', function () {
    let $resultElement;
    let offerElement;

    before(function () {
      CliqzUtils.setPref('offersDropdownSwitch', true);
      respondWith({ results });
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
      expect(offerElement.querySelector(titleSelector).textContent.trim())
        .to.equal(results[0].snippet.title);
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
        .to.equal(results[0].snippet.friendlyUrl);
    });

    it('renders description', function () {
      const descriptionSelector = '.description';
      expect(offerElement).to.contain(descriptionSelector);
      expect(offerElement.querySelector(descriptionSelector).textContent.trim())
        .to.equal(results[0].snippet.description);
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
      expect(offerElement.href).to.equal(results[0].snippet.extra.url_ad);
    });
  });
}
