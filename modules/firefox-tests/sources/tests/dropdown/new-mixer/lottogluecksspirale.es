/* global it, expect, chai, chai-dom, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from '../fixtures/resultsLottoGluecksspirale';

export default function () {
  context('for a Lotto Gluecksspirale rich header', function () {
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('gluecksspirale');
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

    describe('renders Lotto winning results', function () {
      it('successfully', function () {
        const lottoResultSelector = 'div.lotto';
        chai.expect(resultElement.querySelector(lottoResultSelector)).to.exist;
      });

      it('with existing and correct heading', function () {
        const lottoResultHeadingSelector = 'div.lotto p.lotto-date';
        chai.expect(resultElement.querySelector(lottoResultHeadingSelector)).to.exist;

        /* Using hardcoded values here to check if mocked data is
           displayed correctly */
        chai.expect(resultElement.querySelector(lottoResultHeadingSelector))
          .to.contain.text('Gewinnzahlen');
        chai.expect(resultElement.querySelector(lottoResultHeadingSelector))
            .to.contain.text('Samstag');
        chai.expect(resultElement.querySelector(lottoResultHeadingSelector))
              .to.contain.text('15.7.2017');
      });

      it('with existing and correct disclaimer', function () {
        const lottoDisclaimerSelector = 'div.lotto p.no-guarantee';
        chai.expect(resultElement.querySelector(lottoDisclaimerSelector)).to.exist;
        chai.expect(resultElement.querySelector(lottoDisclaimerSelector))
            .to.have.text('Alle Angaben ohne Gewähr');
      });

      describe('in rows', function () {
        it('existing and in correct amount', function () {
          const lottoRowSelector = 'div.lotto div.row';
          const lottoItemsRows = resultElement.querySelectorAll(lottoRowSelector);
          [].forEach.call(lottoItemsRows, function (row) {
            chai.expect(row).to.exist;
          });
          chai.expect(resultElement.querySelectorAll(lottoRowSelector).length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.gs.gewinnzahlen[6].length);
        });

        it('with existing and correct amount of number squares', function () {
          const lottoRowSelector = 'div.lotto div.row';
          const lottoItemsRows = resultElement.querySelectorAll(lottoRowSelector);
          const lottoSquareSelector = 'div.lotto-item-wrapper div.item';
          [].forEach.call(lottoItemsRows, function (row, i) {
            const lottoSquaresItems = row.querySelectorAll(lottoSquareSelector);
            [].forEach.call(lottoSquaresItems, function (square) {
              chai.expect(square).to.exist;
            });
            chai.expect(lottoSquaresItems.length)
              .to.equal(results[0].snippet.extra.lotto_list.cur_date.gs.gewinnzahlen[6][i].length);
          });
        });

        it('with correct results', function () {
          const lottoRowSelector = 'div.lotto div.row';
          const lottoItemsRows = resultElement.querySelectorAll(lottoRowSelector);
          const lottoSquareSelector = 'div.lotto-item-wrapper div.item';
          [].forEach.call(lottoItemsRows, function (row, i) {
            const lottoSquaresItems = row.querySelectorAll(lottoSquareSelector);
            [].forEach.call(lottoSquaresItems, function (square, j) {
              chai.expect(square)
                .to.contain.text(results[0].snippet.extra
                  .lotto_list.cur_date.gs.gewinnzahlen[6][i][j]);
            });
          });
        });

        it('with existing and correct winning class', function () {
          const lottoKlasseSelector = 'div.lotto div.row span.description';
          const lottoItemsKlassen = resultElement.querySelectorAll(lottoKlasseSelector);
          [].forEach.call(lottoItemsKlassen, function (klasse) {
            chai.expect(klasse).to.exist;
            chai.expect(klasse).to.have.text('Gewinnklasse 7');
          });
        });
      });
    });

    describe('renders buttons', function () {
      it('successfully', function () {
        const lottoButtonsSelector = 'div.buttons';
        chai.expect(lottoButtonsSelector).to.exist;
      });

      it('correct amount', function () {
        const lottoButtonsSelector = 'div.buttons a.btn';
        chai.expect(resultElement.querySelectorAll(lottoButtonsSelector).length)
          .to.equal(results[0].snippet.deepResults[0].links.length);
      });

      it('with correct text', function () {
        const lottoButtonsSelector = 'div.buttons a.btn';
        const lottoItemsButtons = resultElement.querySelectorAll(lottoButtonsSelector);
        [].forEach.call(lottoItemsButtons, function (button, i) {
          chai.expect(button).to.contain.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with correct links', function () {
        const lottoButtonsSelector = 'div.buttons a.btn';
        const lottoItemsButtons = resultElement.querySelectorAll(lottoButtonsSelector);
        [].forEach.call(lottoItemsButtons, function (link, i) {
          chai.expect(link.href).to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });
  });
}
