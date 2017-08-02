/* global it, expect, chai, chai-dom, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a Lotto 6 Aus 49 rich header', function () {
    const results = [
      {
        url: 'https://www.lotto.de/de/ergebnisse/lotto-6aus49/lottozahlen.html',
        score: 0,
        snippet: {
          deepResults: [
            {
              links: [
                {
                  title: 'Glücksspirale',
                  url: 'https://www.lotto.de/de/ergebnisse/gluecksspirale/gluecksspirale-gewinnzahlen.html'
                },
                {
                  title: 'Keno',
                  url: 'https://www.lotto.de/de/ergebnisse/keno/kenozahlen.html'
                },
                {
                  title: '6aus49',
                  url: 'https://www.lotto.de/de/ergebnisse/lotto-6aus49/lottozahlen.html'
                },
                {
                  title: 'EuroJackpot',
                  url: 'https://www.lotto.de/de/ergebnisse/eurojackpot/eurojackpot-zahlen.html'
                }
              ],
              type: 'buttons'
            }
          ],
          description: 'Description: Aktuelle Lottozahlen und Lottoquoten der Ziehung von LOTTO...',
          extra: {
            lotto_list: {
              cur_date: {
                date: '2017-07-19',
                lotto: {
                  gewinnzahlen: [
                    '17',
                    '19',
                    '21',
                    '27',
                    '36',
                    '41'
                  ],
                  spieleinsatz: '24896836.00',
                  superzahl: '1',
                  waehrung: 'EUR',
                  zusatzzahl: null
                },
                spiel77: {
                  gewinnzahlen: '0177997',
                  spieleinsatz: '5100027.50',
                  waehrung: 'EUR'
                },
                super6: {
                  gewinnzahlen: '422100',
                  spieleinsatz: '2176462.50',
                  waehrung: 'EUR'
                },
                year: 2017
              }
            },
            lotto_type: '6aus49'
          },
          friendlyUrl: 'lotto.de/de/ergebnisse/lotto-6aus49/lottozahlen.html',
          title: 'Lotto 6 aus 49'
        },
        type: 'rh',
        subType: {
          class: 'EntityLotto',
          id: '-5001137949554477336',
          name: 'Lotto6aus49Impl'
        },
        template: 'lotto',
        trigger_method: 'query'
      }
    ];
    let resultElement;

    beforeEach(function () {
      respondWith({ results });
      fillIn('6 aus 49');
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
            .to.contain.text('Mittwoch');
        chai.expect(resultElement.querySelector(lottoResultHeadingSelector))
              .to.contain.text('19.7.2017');
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
            chai.expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          chai.expect(lotto6Aus49Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.lotto.gewinnzahlen.length + 1);
        });

        it('with correct value of numerical elelements', function () {
          lotto6Aus49Numbers.forEach(function (element, i) {
            chai.expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.lotto.gewinnzahlen[i]);
          });
        });

        it('with correct value of Superzahl', function () {
          chai.expect(superZahl).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.lotto.superzahl);
        });

        it('with existing and correct label of Superzahl', function () {
          const superZahlLabelSelector = 'div.lotto div.row span.description';
          chai.expect(resultElement.querySelector(superZahlLabelSelector)).to.exist;
          chai.expect(resultElement.querySelector(superZahlLabelSelector))
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
            chai.expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          chai.expect(lottoSpiel77Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.spiel77.gewinnzahlen.length + 1);
        });

        it('with correct value of numerical elelements', function () {
          lottoSpiel77Numbers = [...lottoSpiel77Elements].slice(1);
          lottoSpiel77Numbers.forEach(function (element, i) {
            chai.expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.spiel77.gewinnzahlen[i]);
          });
        });

        it('with existing and correct label', function () {
          const lottoSpiel77Label = [...lottoSpiel77Elements][0];
          chai.expect(lottoSpiel77Label).to.contain.text('Spiel77');
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
            chai.expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          chai.expect(lottoSuper6Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.super6.gewinnzahlen.length + 1);
        });

        it('with correct value of numerical elelements', function () {
          lottoSuper6Numbers = [...lottoSuper6Elements].slice(1);
          lottoSuper6Numbers.forEach(function (element, i) {
            chai.expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.super6.gewinnzahlen[i]);
          });
        });

        it('with existing and correct label', function () {
          const lottoSuper6Label = [...lottoSuper6Elements][0];
          chai.expect(lottoSuper6Label).to.contain.text('Super6');
        });
      });
    });
  });
}
