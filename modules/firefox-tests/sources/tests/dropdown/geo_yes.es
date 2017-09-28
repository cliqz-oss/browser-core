/* global it, expect, chai, chai-dom, respondWith, fillIn,waitForPopup,
   $cliqzResults, getLocaliseString */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a local rich header with geo consent', function () {
    const results = [
      {
        url: 'https://www.rewe.de/',
        score: 20141,
        source: 'bm',
        snippet: {
          deepResults: [
            {
              links: [
                {
                  extra: {
                    rank: 10239.655172413793
                  },
                  title: 'Dein REWE Markt',
                  url: 'https://www.rewe.de/angebote/'
                },
                {
                  extra: {
                    rank: 5833.928571428572
                  },
                  title: 'Online bestellen',
                  url: 'https://shop.rewe.de/'
                },
                {
                  extra: {
                    rank: 3298.777777777778
                  },
                  title: 'REWE Karriere',
                  url: 'https://karriere.rewe.de/'
                },
                {
                  extra: {
                    rank: 2977.4375
                  },
                  title: 'Marktkonzepte',
                  url: 'https://www.rewe.de/marktsuche/'
                }
              ],
              type: 'buttons'
            }
          ],
          description: 'Bei REWE.DE Jede Woche neue Lebensmittel-Angebote in Ihrer REWE Filiale entdecken. Übrigens: Wir liefern Lebensmittel auch direkt nach Hause! Weiter »',
          extra: {
            address: 'Rosenkavalierpl. 5, 81925 München, Germany',
            lat: 48.1524031,
            lon: 11.6201442,
            map_img: 'https://cdn.cliqz.com/snippets/maps.svg',
            mu: 'https://www.google.de/maps/place/rewe+arabellapark/data=!4m2!3m1!1s0x0:0xe48aa587df46aa23?sa=X&sqi=2&ved=0CCgQrwswAGoVChMI_f_guKbiyAIVBogsCh2dMAtO',
            phonenumber: '089 91059059',
            rating: 3.8,
            superTemplate: 'local-data-sc',
            t: 'REWE Center',
            timestamp: 1455595961.797042,
            u: 'rewe.de/marktseite'
          },
          friendlyUrl: 'rewe.de',
          title: 'REWE.de - Ihre Startseite für Lebensmittel im Internet!'
        },
        c_url: 'https://www.rewe.de/',
        type: 'rh',
        subType: {
          class: 'EntityLocal',
          id: '-8511502387253052801_noloc',
          name: 'rewe.de'
        },
        template: 'generic',
        trigger_method: 'url'
      }
    ];
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('rewe');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0].parentNode;
      });
    });

    it('renders rich header result successfully', function () {
      chai.expect(resultElement).to.exist;
    });

    describe('renders top element', function () {
      it('successfully', function () {
        const localTopSelector = 'a.result';
        chai.expect(resultElement.querySelector(localTopSelector)).to.exist;
      });

      it('with existing and correct title', function () {
        const localTopTitleSelector = 'a.result div.abstract span.title';
        chai.expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
        chai.expect(resultElement.querySelector(localTopTitleSelector))
          .to.have.text(results[0].snippet.title);
      });

      it('with existing and correct domain', function () {
        const localTopTitleSelector = 'a.result div.abstract span.url';
        chai.expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
        chai.expect(resultElement.querySelector(localTopTitleSelector))
          .to.contain.text(results[0].snippet.friendlyUrl);
      });

      it('with existing logo', function () {
        const localTopLogoSelector = 'a.result div.icons span.logo';
        chai.expect(resultElement.querySelector(localTopLogoSelector)).to.exist;
      });

      it('with a correct link', function () {
        const localTopLinkSelector = 'a.result';
        chai.expect(resultElement.querySelector(localTopLinkSelector).href)
          .to.equal(results[0].url);
      });

      it('with existing and correct description', function () {
        const localTopDescSelector = 'a.result div.abstract span.description';
        chai.expect(resultElement.querySelector(localTopDescSelector)).to.exist;
        chai.expect(resultElement.querySelector(localTopDescSelector))
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
        chai.expect(buttonsItems.length)
          .to.equal(results[0].snippet.deepResults[0].links.length);
      });

      it('with correct text', function () {
        [...buttonsItems].forEach(function (button, i) {
          chai.expect(button).to.contain.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with correct links', function () {
        [...buttonsItems].forEach(function (link, i) {
          chai.expect(link.href).to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });

    describe('renders local result', function () {
      const localAreaSelector = 'local-result-wrapper';

      it('successfully', function () {
        chai.expect(localAreaSelector).to.exist;
      });

      it('with existing and correct image', function () {
        const localMapSelector = 'a.local-map';
        const localMapItem = resultElement.querySelector(localMapSelector);
        chai.expect(localMapItem).to.exist;
        chai.expect(localMapItem.href).to.equal(results[0].snippet.extra.mu);
      });

      it('with existing and correct address', function () {
        const localAddressSelector = 'div.local-info div.local-address';
        const localAddressItem = resultElement.querySelector(localAddressSelector);
        chai.expect(localAddressItem).to.exist;
        chai.expect(localAddressItem).to.contain.text(results[0].snippet.extra.address);
      });

      it('with existing and correct phone number', function () {
        const localPhoneSelector = 'div.local-info div.local-phone';
        const localPhoneItem = resultElement.querySelector(localPhoneSelector);
        chai.expect(localPhoneItem).to.exist;
        chai.expect(localPhoneItem).to.contain.text(results[0].snippet.extra.phonenumber);
      });
    });
  });
}
