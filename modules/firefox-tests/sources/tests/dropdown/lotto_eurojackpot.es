import {
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsLottoEurojackpot';

export default function () {
  context('for a Lotto Eurojackpot rich header', function () {
    let $resultElement;

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('eurojackpot');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults().find(`a.result[data-url='${results[0].url}']`)[0].parentNode;
      });
    });

    it('renders rich header result successfully', function () {
      expect($resultElement).to.exist;
    });

    describe('renders top element', function () {
      it('successfully', function () {
        const lottoTopSelector = 'a.result';
        expect($resultElement.querySelector(lottoTopSelector)).to.exist;
      });

      it('with existing and correct title', function () {
        const lottoTopTitleSelector = 'a.result div.abstract span.title';
        expect($resultElement.querySelector(lottoTopTitleSelector)).to.exist;
        expect($resultElement.querySelector(lottoTopTitleSelector))
          .to.have.text(results[0].snippet.title);
      });

      it('with existing and correct domain', function () {
        const lottoTopTitleSelector = 'a.result div.abstract span.url';
        expect($resultElement.querySelector(lottoTopTitleSelector)).to.exist;
        expect($resultElement.querySelector(lottoTopTitleSelector))
          .to.contain.text(results[0].snippet.friendlyUrl);
      });

      it('with existing logo', function () {
        const lottoTopLogoSelector = 'a.result div.icons span.logo';
        expect($resultElement.querySelector(lottoTopLogoSelector)).to.exist;
      });

      it('with a correct link', function () {
        const lottoTopLinkSelector = 'a.result';
        expect($resultElement.querySelector(lottoTopLinkSelector).dataset.url)
          .to.equal(results[0].url);
      });

      it('with existing and correct description', function () {
        const lottoTopDescSelector = 'a.result div.abstract span.description';
        expect($resultElement.querySelector(lottoTopDescSelector)).to.exist;
        expect($resultElement.querySelector(lottoTopDescSelector))
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
        expect(buttonsItems.length).to.equal(results[0].snippet.deepResults[0].links.length);
      });

      it('with correct text', function () {
        [...buttonsItems].forEach(function (button, i) {
          expect(button).to.contain.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with correct links', function () {
        [...buttonsItems].forEach(function (button, i) {
          expect(button.dataset.url).to.equal(results[0].snippet.deepResults[0].links[i].url);
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
          .to.contain.text('Freitag');
        expect($resultElement.querySelector(lottoResultHeadingSelector))
          .to.contain.text('14.7.2017');
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
            expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          expect(lotto5Aus50Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.ej.gewinnzahlen.length);
        });

        it('with correct value of numerical elements', function () {
          [...lotto5Aus50Elements].forEach(function (element, i) {
            expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.ej.gewinnzahlen[i]);
          });
        });

        it('with existing and correct label', function () {
          const aus50LabelSelector = 'span.description';
          expect(aus50.querySelector(aus50LabelSelector)).to.exist;
          expect(aus50.querySelector(aus50LabelSelector))
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
            expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          expect(lotto2Aus10Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.ej.zwei_aus_acht.length);
        });

        it('with correct value of numerical elements', function () {
          [...lotto2Aus10Elements].forEach(function (element, i) {
            expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.ej.zwei_aus_acht[i]);
          });
        });

        it('with existing and correct label', function () {
          const aus10LabelSelector = 'span.description';
          expect(aus10.querySelector(aus10LabelSelector)).to.exist;
          expect(aus10.querySelector(aus10LabelSelector))
            .to.have.text('2 aus 10');
        });
      });
    });
  });
}
