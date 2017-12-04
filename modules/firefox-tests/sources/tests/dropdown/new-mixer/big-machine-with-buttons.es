/* global it, expect, chai, chai-dom, respondWith, withHistory,
          fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from '../fixtures/resultsBigMachineWithButtons';

export default function () {
  context('big machine with buttons', function () {
    let resultElement;

    before(function () {
      withHistory([]);
      respondWith({ results });
      fillIn('google');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    describe('renders results', function () {
      it('with correct titles', function () {
        const resultSelector = 'a.result:not(.btn)';
        const resultsItems = resultElement.querySelectorAll(resultSelector);
        const titleSelector = ".abstract span[data-extra='title']";
        [].forEach.call(resultsItems, function (result, i) {
          expect(result).to.contain(titleSelector);
          expect(result.querySelector(titleSelector)).to.have.text(results[i].snippet.title);
        });
      });

      it('with correct description', function () {
        const resultSelector = 'a.result:not(.btn)';
        const resultsItems = resultElement.querySelectorAll(resultSelector);
        const descriptionSelector = '.description';
        [].forEach.call(resultsItems, function (result, i) {
          expect(result).to.contain(descriptionSelector);
          if (typeof results[i].snippet.description === 'undefined') {
            expect(result.querySelector(descriptionSelector)).to.have.text(results[i].url);
          } else {
            expect(result.querySelector(descriptionSelector))
              .to.have.text(results[i].snippet.description);
          }
        });
      });

      it('with correct urls', function () {
        const resultSelector = 'a.result:not(.btn)';
        const resultsItems = resultElement.querySelectorAll(resultSelector);
        const urlSelector = ".abstract span[class='url']";
        [].forEach.call(resultsItems, function (result, i) {
          expect(result).to.contain(urlSelector);
          if (typeof results[i].snippet.friendlyUrl === 'undefined') {
            expect(result.querySelector(urlSelector)).to.have.text(results[i].url);
          } else {
            expect(result.querySelector(urlSelector)).to.have.text(results[i].snippet.friendlyUrl);
          }
        });
      });

      it('with logos', function () {
        const resultSelector = 'a.result:not(.btn)';
        const resultsItems = resultElement.querySelectorAll(resultSelector);
        const logoSelector = ".icons span[class='logo']";
        [].forEach.call(resultsItems, function (result) {
          expect(result).to.contain(logoSelector);
        });
      });
    });

    describe('renders buttons', function () {
      it('successfully', function () {
        const buttonsAreaSelector = 'div.buttons';
        expect(resultElement.querySelector(buttonsAreaSelector)).to.exist;
      });

      it('correct amount of buttons', function () {
        const buttonSelector = 'div.buttons a.btn';
        const amountOfButtons = 4;
        expect(resultElement.querySelectorAll(buttonSelector).length).to.equal(amountOfButtons);
      });

      it('with correct text', function () {
        const buttonSelector = 'div.buttons a.btn';
        const buttonsItems = resultElement.querySelectorAll(buttonSelector);
        [].forEach.call(buttonsItems, function (button, i) {
          expect(button).to.contain.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with correct links', function () {
        const buttonSelector = 'div.buttons a.btn';
        const buttonsItems = resultElement.querySelectorAll(buttonSelector);
        [].forEach.call(buttonsItems, function (button, i) {
          expect(button.href).to.contain(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });
  });
}
