/* global it, expect, chai, chai-dom, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a Keno rich header', function () {
    const results = [
      {
        url: 'https://www.lotto.de/de/ergebnisse/keno/kenozahlen.html',
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
          description: 'Täglich aktuelle Kenozahlen und Quoten der letzten Ziehungen...',
          extra: {
            lotto_list: {
              cur_date: {
                date: '2017-07-26',
                keno: {
                  gewinnzahlen: [
                    '2',
                    '9',
                    '12',
                    '15',
                    '16',
                    '17',
                    '20',
                    '27',
                    '33',
                    '37',
                    '38',
                    '40',
                    '45',
                    '52',
                    '53',
                    '55',
                    '58',
                    '60',
                    '67',
                    '70'
                  ],
                  spieleinsatz: null,
                  waehrung: 'EUR'
                },
                kw: 30,
                plus5: {
                  gewinnzahlen: '45681'
                },
                year: 2017
              }
            },
            lotto_type: 'keno'
          },
          friendlyUrl: 'lotto.de/de/ergebnisse/keno/kenozahlen.html',
          title: 'KENO spielen, Gewinnzahlen, Quoten...'
        },
        type: 'rh',
        subType: {
          class: 'EntityLotto',
          id: '-9214692131128402095',
          name: 'LottoKenoImpl'
        },
        template: 'lotto',
        trigger_method: 'query'
      }
    ];
    let resultElement;

    beforeEach(function () {
      respondWith({ results });
      fillIn('keno');
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
      let keno;

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
              .to.contain.text('26.7.2017');
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

      describe('with 1st row of Keno results', function () {
        let lottoKenoFirstHalf;

        beforeEach(function () {
          keno = lottoItemsRows[0];
          lottoKenoFirstHalf = keno.querySelectorAll(lottoElementSelector);
        });

        it('with existing elements', function () {
          [...lottoElementSelector].forEach(function (element) {
            chai.expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          chai.expect(lottoKenoFirstHalf.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.keno.gewinnzahlen.length / 2);
        });

        it('with correct value of numerical elelements', function () {
          [...lottoKenoFirstHalf].forEach(function (element, i) {
            chai.expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.keno.gewinnzahlen[i]);
          });
        });
      });

      describe('with 2nd row of Keno results', function () {
        let lottoKenoSecondHalf;

        beforeEach(function () {
          keno = lottoItemsRows[1];
          lottoKenoSecondHalf = keno.querySelectorAll(lottoElementSelector);
        });

        it('with existing elements', function () {
          [...lottoElementSelector].forEach(function (element) {
            chai.expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          chai.expect(lottoKenoSecondHalf.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.keno.gewinnzahlen.length / 2);
        });

        it('with correct value of numerical elelements', function () {
          [...lottoKenoSecondHalf].forEach(function (element, i) {
            chai.expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.keno.gewinnzahlen[i + 10]);
          });
        });
      });

      describe('with plus5 results', function () {
        let plus5;
        let lottoPlus5Elements;
        let lottoPlus5Numbers;
        let plus5Label;

        beforeEach(function () {
          plus5 = lottoItemsRows[2];
          lottoPlus5Elements = plus5.querySelectorAll(lottoElementSelector);
          lottoPlus5Numbers = [...lottoPlus5Elements].slice(1);
          plus5Label = lottoPlus5Elements[0];
        });

        it('with existing elements', function () {
          [...lottoElementSelector].forEach(function (element) {
            chai.expect(element).to.exist;
          });
        });

        it('with correct amount of elements', function () {
          chai.expect(lottoPlus5Elements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.plus5.gewinnzahlen.length + 1);
        });

        it('with correct value of numerical elelements', function () {
          [...lottoPlus5Numbers].forEach(function (element, i) {
            chai.expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.plus5.gewinnzahlen[i]);
          });
        });

        it('with a correct label', function () {
          chai.expect(plus5Label).to.contain.text('plus5');
        });
      });
    });
  });
}
