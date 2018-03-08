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
import results from './fixtures/resultsLotto6Aus49';

export default function () {
  context('for a Lotto 6 Aus 49 rich header', function () {
    let $resultElement;

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('6 aus 49');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0].parentNode;
      });
    });

    it('renders rich header result successfully', function () {
      expect($resultElement).to.exist;
    });

    describe('renders parent element', function () {
      const parentSelector = 'a.result';
      let $parent;

      before(function () {
        $parent = $resultElement.querySelector(parentSelector);
      });

      it('successfully', function () {
        expect($parent).to.exist;
      });

      it('with an existing and correct title', function () {
        const parentTitleSelector = '.abstract .title';
        const $parentTitle = $parent.querySelector(parentTitleSelector);
        expect($parentTitle).to.exist;
        expect($parentTitle).to.have.text(results[0].snippet.title);
      });

      it('with an existing and correct description', function () {
        const parentDescSelector = '.abstract .description';
        const $parentDesc = $parent.querySelector(parentDescSelector);
        expect($parentDesc).to.exist;
        expect($parentDesc).to.have.text(results[0].snippet.description);
      });

      it('with an existing and correct domain', function () {
        const parentDomainSelector = '.abstract .url';
        const $parentDomain = $parent.querySelector(parentDomainSelector);
        expect($parentDomain).to.exist;
        expect($parentDomain).to.contain.text(results[0].snippet.friendlyUrl);
      });

      it('with an existing logo', function () {
        const parentLogoSelector = '.icons .logo';
        const $parentLogo = $parent.querySelector(parentLogoSelector);
        expect($parentLogo).to.exist;
      });

      it('with am existing and correct URL', function () {
        expect($parent.href).to.exist;
        expect($parent.href).to.equal(results[0].url);
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
        expect(buttonsItems.length).to.equal(results[0].snippet.deepResults[0].links.length);
      });

      it('with correct text', function () {
        [...buttonsItems].forEach(function (button, i) {
          expect(button).to.contain.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with correct links', function () {
        [...buttonsItems].forEach(function (button, i) {
          expect(button.href).to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });

    describe('renders winning results block', function () {
      const lottoRowSelector = 'div.lotto div.row';
      const lottoElementSelector = 'div.item';
      let lottoItemsRows;

      beforeEach(function () {
        lottoItemsRows = $resultElement.querySelectorAll(lottoRowSelector);
      });

      it('successfully', function () {
        const lottoResultSelector = 'div.lotto';
        expect($resultElement.querySelector(lottoResultSelector)).to.exist;
      });

      it('with existing and correct heading', function () {
        const lottoResultHeadingSelector = 'div.lotto p.lotto-date';
        expect($resultElement.querySelector(lottoResultHeadingSelector)).to.exist;

        expect($resultElement.querySelector(lottoResultHeadingSelector))
          .to.contain.text('Gewinnzahlen');
        expect($resultElement.querySelector(lottoResultHeadingSelector))
          .to.contain.text('Mittwoch');
        expect($resultElement.querySelector(lottoResultHeadingSelector))
          .to.contain.text('19.7.2017');
      });

      it('with existing and correct disclaimer', function () {
        const lottoDisclaimerSelector = 'div.lotto p.no-guarantee';
        expect($resultElement.querySelector(lottoDisclaimerSelector)).to.exist;
        expect($resultElement.querySelector(lottoDisclaimerSelector))
          .to.have.text('Alle Angaben ohne Gewähr');
      });

      it('with existing winning results blocks and in correct amount', function () {
        [...lottoItemsRows].forEach(function (row) {
          expect(row).to.exist;
        });
        expect($resultElement.querySelectorAll(lottoRowSelector).length)
          .to.equal(3);
      });

      describe('with 6 aus 49 results', function () {
        let aus49;
        let lotto6Aus49Elements;
        let lotto6Aus49Numbers;
        let superZahl;

        beforeEach(function () {
          aus49 = lottoItemsRows[0];
          lotto6Aus49Elements = aus49.querySelectorAll(lottoElementSelector);
          lotto6Aus49Numbers = [...lotto6Aus49Elements].slice(0, lotto6Aus49Elements.length - 1);
          superZahl = lotto6Aus49Elements[lotto6Aus49Elements.length - 1];
        });

        it('with existing elements', function () {
          [...lottoElementSelector].forEach(function (element) {
            expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          expect(lotto6Aus49Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.lotto.gewinnzahlen.length + 1);
        });

        it('with correct value of numerical elelements', function () {
          [...lotto6Aus49Numbers].forEach(function (element, i) {
            expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.lotto.gewinnzahlen[i]);
          });
        });

        it('with correct value of Superzahl', function () {
          expect(superZahl).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.lotto.superzahl);
        });

        it('with existing and correct label of Superzahl', function () {
          const superZahlLabelSelector = 'div.lotto div.row span.description';
          expect($resultElement.querySelector(superZahlLabelSelector)).to.exist;
          expect($resultElement.querySelector(superZahlLabelSelector))
            .to.have.text('Superzahl');
        });
      });

      describe('with Spiel77 results', function () {
        let spiel77;
        let lottoSpiel77Elements;
        let lottoSpiel77Numbers;

        beforeEach(function () {
          spiel77 = lottoItemsRows[1];
          lottoSpiel77Elements = spiel77.querySelectorAll(lottoElementSelector);
        });

        it('with existing elements', function () {
          [...lottoElementSelector].forEach(function (element) {
            expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          expect(lottoSpiel77Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.spiel77.gewinnzahlen.length + 1);
        });

        it('with correct value of numerical elelements', function () {
          lottoSpiel77Numbers = [...lottoSpiel77Elements].slice(1);
          [...lottoSpiel77Numbers].forEach(function (element, i) {
            expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.spiel77.gewinnzahlen[i]);
          });
        });

        it('with existing and correct label', function () {
          const lottoSpiel77Label = [...lottoSpiel77Elements][0];
          expect(lottoSpiel77Label).to.contain.text('Spiel77');
        });
      });

      describe('with Super6 results', function () {
        let super6;
        let lottoSuper6Elements;
        let lottoSuper6Numbers;

        beforeEach(function () {
          super6 = lottoItemsRows[2];
          lottoSuper6Elements = super6.querySelectorAll(lottoElementSelector);
        });

        it('with existing elements', function () {
          [...lottoElementSelector].forEach(function (element) {
            expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          expect(lottoSuper6Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.super6.gewinnzahlen.length + 1);
        });

        it('with correct value of numerical elelements', function () {
          lottoSuper6Numbers = [...lottoSuper6Elements].slice(1);
          [...lottoSuper6Numbers].forEach(function (element, i) {
            expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.super6.gewinnzahlen[i]);
          });
        });

        it('with existing and correct label', function () {
          const lottoSuper6Label = [...lottoSuper6Elements][0];
          expect(lottoSuper6Label).to.contain.text('Super6');
        });
      });
    });
  });
}
