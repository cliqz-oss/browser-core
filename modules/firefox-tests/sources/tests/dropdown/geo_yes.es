/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsGeoYes';

export default function () {
  context('for a local rich header with geo consent', function () {
    let $resultElement;

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('rewe');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0].parentNode;
      });
    });

    it('renders rich header result successfully', function () {
      expect($resultElement).to.exist;
    });

    describe('renders top element', function () {
      it('successfully', function () {
        const localTopSelector = 'a.result';
        expect($resultElement.querySelector(localTopSelector)).to.exist;
      });

      it('with existing and correct title', function () {
        const localTopTitleSelector = 'a.result div.abstract span.title';
        expect($resultElement.querySelector(localTopTitleSelector)).to.exist;
        expect($resultElement.querySelector(localTopTitleSelector))
          .to.have.text(results[0].snippet.title);
      });

      it('with existing and correct domain', function () {
        const localTopTitleSelector = 'a.result div.abstract span.url';
        expect($resultElement.querySelector(localTopTitleSelector)).to.exist;
        expect($resultElement.querySelector(localTopTitleSelector))
          .to.contain.text(results[0].snippet.friendlyUrl);
      });

      it('with existing logo', function () {
        const localTopLogoSelector = 'a.result div.icons span.logo';
        expect($resultElement.querySelector(localTopLogoSelector)).to.exist;
      });

      it('with a correct link', function () {
        const localTopLinkSelector = 'a.result';
        expect($resultElement.querySelector(localTopLinkSelector).href)
          .to.equal(results[0].url);
      });

      it('with existing and correct description', function () {
        const localTopDescSelector = 'a.result div.abstract span.description';
        expect($resultElement.querySelector(localTopDescSelector)).to.exist;
        expect($resultElement.querySelector(localTopDescSelector))
          .to.have.text(results[0].snippet.description);
      });
    });

    describe('renders buttons', function () {
      const buttonsAreaSelector = 'div.buttons';
      const buttonSelector = 'div.buttons a.btn';
      let buttonsArea;
      let buttonsItems;

      beforeEach(function () {
        buttonsArea = $resultElement.querySelector(buttonsAreaSelector);
        buttonsItems = $resultElement.querySelectorAll(buttonSelector);
      });

      it('successfully', function () {
        expect(buttonsArea).to.exist;
        [...buttonsItems].forEach(function (button) {
          expect(button).to.exist;
        });
      });

      it('correct amount', function () {
        expect(buttonsItems.length)
          .to.equal(results[0].snippet.deepResults[0].links.length);
      });

      it('with correct text', function () {
        [...buttonsItems].forEach(function (button, i) {
          expect(button).to.contain.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with correct links', function () {
        [...buttonsItems].forEach(function (link, i) {
          expect(link.href).to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });

    describe('renders local result', function () {
      const localAreaSelector = 'local-result-wrapper';

      it('successfully', function () {
        expect(localAreaSelector).to.exist;
      });

      it('with existing and correct image', function () {
        const localMapSelector = 'a.local-map';
        const localMapItem = $resultElement.querySelector(localMapSelector);
        expect(localMapItem).to.exist;
        expect(localMapItem.href).to.equal(results[0].snippet.extra.mu);
      });

      it('with existing and correct address', function () {
        const localAddressSelector = 'div.local-info div.local-address';
        const localAddressItem = $resultElement.querySelector(localAddressSelector);
        expect(localAddressItem).to.exist;
        expect(localAddressItem).to.contain.text(results[0].snippet.extra.address);
      });

      it('with existing and correct phone number', function () {
        const localPhoneSelector = 'div.local-info div.local-phone';
        const localPhoneItem = $resultElement.querySelector(localPhoneSelector);
        expect(localPhoneItem).to.exist;
        expect(localPhoneItem).to.contain.text(results[0].snippet.extra.phonenumber);
      });
    });
  });
}
