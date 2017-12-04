/* global it, expect, chai, chai-dom, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from '../fixtures/resultsLottoEurojackpot';

export default function () {
  context('for a Lotto Eurojackpot rich header', function () {
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('eurojackpot');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0].parentNode;
      });
    });

    it('renders rich header result successfully', function () {
      chai.expect(resultElement).to.exist;
    });

    describe('renders top element', function () {
      it('successfully', function () {
        const lottoTopSelector = 'a.result';
        chai.expect(resultElement.querySelector(lottoTopSelector)).to.exist;
      });

      it('with existing and correct title', function () {
        const lottoTopTitleSelector = 'a.result div.abstract span.title';
        chai.expect(resultElement.querySelector(lottoTopTitleSelector)).to.exist;
        chai.expect(resultElement.querySelector(lottoTopTitleSelector))
        .to.have.text(results[0].snippet.title);
      });

      it('with existing and correct domain', function () {
        const lottoTopTitleSelector = 'a.result div.abstract span.url';
        chai.expect(resultElement.querySelector(lottoTopTitleSelector)).to.exist;
        chai.expect(resultElement.querySelector(lottoTopTitleSelector))
        .to.contain.text(results[0].snippet.friendlyUrl);
      });

      it('with existing logo', function () {
        const lottoTopLogoSelector = 'a.result div.icons span.logo';
        chai.expect(resultElement.querySelector(lottoTopLogoSelector)).to.exist;
      });

      it('with a correct link', function () {
        const lottoTopLinkSelector = 'a.result';
        chai.expect(resultElement.querySelector(lottoTopLinkSelector).href)
        .to.equal(results[0].url);
      });

      it('with existing and correct description', function () {
        const lottoTopDescSelector = 'a.result div.abstract span.description';
        chai.expect(resultElement.querySelector(lottoTopDescSelector)).to.exist;
        chai.expect(resultElement.querySelector(lottoTopDescSelector))
        .to.have.text(results[0].snippet.description);
      });
    });

    describe('renders buttons', function () {
      const buttonsAreaSelector = 'div.buttons';
      const buttonSelector = 'div.buttons a.btn';
      let buttonsArea;
      let buttonsItems;

      beforeEach(function () {
        buttonsArea = resultElement.querySelector(buttonsAreaSelector);
        buttonsItems = resultElement.querySelectorAll(buttonSelector);
      });

      it('successfully', function () {
        chai.expect(buttonsArea).to.exist;
        [...buttonsItems].forEach(function (button) {
          chai.expect(button).to.exist;
        });
      });

      it('correct amount', function () {
        chai.expect(buttonsItems.length).to.equal(results[0].snippet.deepResults[0].links.length);
      });

      it('with correct text', function () {
        [...buttonsItems].forEach(function (button, i) {
          chai.expect(button).to.contain.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with correct links', function () {
        [...buttonsItems].forEach(function (button, i) {
          chai.expect(button.href).to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });

    describe('renders winning results block', function () {
      const lottoRowSelector = 'div.lotto div.row';
      const lottoElementSelector = 'div.item';
      let lottoItemsRows;

      beforeEach(function () {
        lottoItemsRows = resultElement.querySelectorAll(lottoRowSelector);
      });

      it('successfully', function () {
        const lottoResultSelector = 'div.lotto';
        chai.expect(resultElement.querySelector(lottoResultSelector)).to.exist;
      });

      it('with existing and correct heading', function () {
        const lottoResultHeadingSelector = 'div.lotto p.lotto-date';
        chai.expect(resultElement.querySelector(lottoResultHeadingSelector)).to.exist;

        chai.expect(resultElement.querySelector(lottoResultHeadingSelector))
          .to.contain.text('Gewinnzahlen');
        chai.expect(resultElement.querySelector(lottoResultHeadingSelector))
            .to.contain.text('Freitag');
        chai.expect(resultElement.querySelector(lottoResultHeadingSelector))
              .to.contain.text('14.7.2017');
      });

      it('with existing and correct disclaimer', function () {
        const lottoDisclaimerSelector = 'div.lotto p.no-guarantee';
        chai.expect(resultElement.querySelector(lottoDisclaimerSelector)).to.exist;
        chai.expect(resultElement.querySelector(lottoDisclaimerSelector))
            .to.have.text('Alle Angaben ohne Gewähr');
      });

      it('with existing winning results blocks and in correct amount', function () {
        [...lottoItemsRows].forEach(function (row) {
          chai.expect(row).to.exist;
        });
        chai.expect(resultElement.querySelectorAll(lottoRowSelector).length)
          .to.equal(2);
      });

      describe('with 5 aus 50 results', function () {
        let aus50;
        let lotto5Aus50Elements;

        beforeEach(function () {
          aus50 = lottoItemsRows[0];
          lotto5Aus50Elements = aus50.querySelectorAll(lottoElementSelector);
        });

        it('with existing elements', function () {
          [...lottoElementSelector].forEach(function (element) {
            chai.expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          chai.expect(lotto5Aus50Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.ej.gewinnzahlen.length);
        });

        it('with correct value of numerical elements', function () {
          [...lotto5Aus50Elements].forEach(function (element, i) {
            chai.expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.ej.gewinnzahlen[i]);
          });
        });

        it('with existing and correct label', function () {
          const aus50LabelSelector = 'span.description';
          chai.expect(aus50.querySelector(aus50LabelSelector)).to.exist;
          chai.expect(aus50.querySelector(aus50LabelSelector))
            .to.have.text('5 aus 50');
        });
      });

      describe('with 2 aus 10 results', function () {
        let aus10;
        let lotto2Aus10Elements;

        beforeEach(function () {
          aus10 = lottoItemsRows[1];
          lotto2Aus10Elements = aus10.querySelectorAll(lottoElementSelector);
        });

        it('with existing elements', function () {
          [...lottoElementSelector].forEach(function (element) {
            chai.expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          chai.expect(lotto2Aus10Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.ej.zwei_aus_acht.length);
        });

        it('with correct value of numerical elements', function () {
          [...lotto2Aus10Elements].forEach(function (element, i) {
            chai.expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.ej.zwei_aus_acht[i]);
          });
        });

        it('with existing and correct label', function () {
          const aus10LabelSelector = 'span.description';
          chai.expect(aus10.querySelector(aus10LabelSelector)).to.exist;
          chai.expect(aus10.querySelector(aus10LabelSelector))
            .to.have.text('2 aus 10');
        });
      });
    });
  });
}
