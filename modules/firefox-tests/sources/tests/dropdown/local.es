import {
  blurUrlBar,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  getLocaliseString,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import config from '../../../core/config';
import { resultsWithLocal, resultsWithoutLocal } from './fixtures/resultsLocal';

export default function () {
  describe('local results', function () {
    let results;
    let resultElement;
    const query = 'rewe';
    const showOnceSelector = '.result.btn[data-url=\'cliqz-actions,{"type":"location","actionName":"allowOnce"}\']';
    const alwaysShowSelector = '.result.btn[data-url=\'cliqz-actions,{"type":"location","actionName":"allow"}\']';
    context('with "Always ask" settings', function () {
      before(function () {
        blurUrlBar();
        results = resultsWithoutLocal;
        CliqzUtils.setPref('share_location', 'ask');
        withHistory([]);
        respondWith({ results });
        fillIn(query);
        return waitForPopup().then(function () {
          resultElement = $cliqzResults().find(`a.result[data-url='${results[0].url}']`)[0].parentNode;
        });
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      it('renders rich header result successfully', function () {
        expect(resultElement).to.exist;
      });

      it('doesn\'t render deep results buttons', function () {
        results[0].snippet.deepResults[0].links.forEach(function (link) {
          expect(resultElement.querySelector(`.result[data-url="${link.url}"]`)).to.not.exist;
        });
      });

      context('renders top element', function () {
        it('successfully', function () {
          const localTopSelector = 'a.result';
          expect(resultElement.querySelector(localTopSelector)).to.exist;
        });

        it('with existing and correct title', function () {
          const localTopTitleSelector = 'a.result .abstract .title';
          expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
          expect(resultElement.querySelector(localTopTitleSelector))
            .to.have.text(results[0].snippet.title);
        });

        it('with existing and correct domain', function () {
          const localTopTitleSelector = 'a.result .abstract .url';
          expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
          expect(resultElement.querySelector(localTopTitleSelector))
            .to.contain.text(results[0].snippet.friendlyUrl);
        });

        it('with existing logo', function () {
          const localTopLogoSelector = 'a.result .icons .logo';
          expect(resultElement.querySelector(localTopLogoSelector)).to.exist;
        });

        it('with a correct link', function () {
          const localTopLinkSelector = 'a.result';
          expect(resultElement.querySelector(localTopLinkSelector).dataset.url)
            .to.equal(results[0].url);
        });

        it('with existing and correct description', function () {
          const localTopDescSelector = 'a.result .abstract .description';
          expect(resultElement.querySelector(localTopDescSelector)).to.exist;
          expect(resultElement.querySelector(localTopDescSelector))
            .to.have.text(results[0].snippet.description);
        });
      });

      context('renders location settings buttons', function () {
        let showOnceButton;
        let alwaysShowButton;

        before(function () {
          showOnceButton = resultElement.querySelector(showOnceSelector);
          alwaysShowButton = resultElement.querySelector(alwaysShowSelector);
        });

        it('successfully', function () {
          expect(showOnceButton).to.exist;
          expect(alwaysShowButton).to.exist;
        });

        it('with correct text for a button to use location once', function () {
          expect(showOnceButton.textContent.trim()).to.equal(
            getLocaliseString({
              de: 'Ort & Kontakt jetzt anzeigen',
              default: 'Show location & contact now'
            })
          );
        });

        it('with correct text for a button to use location always', function () {
          expect(alwaysShowButton.textContent.trim()).to.equal(
            getLocaliseString({
              de: 'Immer anzeigen',
              default: 'Always show'
            })
          );
        });
      });
    });

    context('with "Never" settings', function () {
      before(function () {
        blurUrlBar();
        results = resultsWithoutLocal;
        CliqzUtils.setPref('share_location', 'no');
        withHistory([]);
        respondWith({ results });
        fillIn(query);
        return waitForPopup().then(function () {
          resultElement = $cliqzResults().find(`a.result[data-url='${results[0].url}']`)[0].parentNode;
        });
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      it('renders rich header result successfully', function () {
        expect(resultElement).to.exist;
      });

      it('doesn\'t render location buttons', function () {
        expect(resultElement.querySelector(showOnceSelector)).to.not.exist;
        expect(resultElement.querySelector(alwaysShowSelector)).to.not.exist;
      });

      context('renders top element', function () {
        it('successfully', function () {
          const localTopSelector = 'a.result';
          expect(resultElement.querySelector(localTopSelector)).to.exist;
        });

        it('with existing and correct title', function () {
          const localTopTitleSelector = 'a.result .abstract .title';
          expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
          expect(resultElement.querySelector(localTopTitleSelector))
            .to.have.text(results[0].snippet.title);
        });

        it('with existing and correct domain', function () {
          const localTopTitleSelector = 'a.result .abstract .url';
          expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
          expect(resultElement.querySelector(localTopTitleSelector))
            .to.contain.text(results[0].snippet.friendlyUrl);
        });

        it('with existing logo', function () {
          const localTopLogoSelector = 'a.result .icons .logo';
          expect(resultElement.querySelector(localTopLogoSelector)).to.exist;
        });

        it('with a correct link', function () {
          const localTopLinkSelector = 'a.result';
          expect(resultElement.querySelector(localTopLinkSelector).dataset.url)
            .to.equal(results[0].url);
        });

        it('with existing and correct description', function () {
          const localTopDescSelector = 'a.result .abstract .description';
          expect(resultElement.querySelector(localTopDescSelector)).to.exist;
          expect(resultElement.querySelector(localTopDescSelector))
            .to.have.text(results[0].snippet.description);
        });
      });

      context('renders deep results buttons', function () {
        const buttonsAreaSelector = 'div.buttons';
        const buttonSelector = 'div.buttons a.btn';
        let buttonsArea;
        let buttonsItems;

        before(function () {
          buttonsArea = resultElement.querySelector(buttonsAreaSelector);
          buttonsItems = resultElement.querySelectorAll(buttonSelector);
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
            expect(link.dataset.url).to.equal(results[0].snippet.deepResults[0].links[i].url);
          });
        });
      });
    });

    context('with "Always" settings', function () {
      before(function () {
        blurUrlBar();
        results = resultsWithLocal;
        CliqzUtils.setPref('share_location', 'yes');
        withHistory([]);
        respondWith({ results });
        fillIn(query);
        return waitForPopup().then(function () {
          resultElement = $cliqzResults().find(`a.result[data-url='${results[0].url}']`)[0].parentNode;
        });
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      it('renders rich header result successfully', function () {
        expect(resultElement).to.exist;
      });

      it('doesn\'t render location buttons', function () {
        expect(resultElement.querySelector(showOnceSelector)).to.not.exist;
        expect(resultElement.querySelector(alwaysShowSelector)).to.not.exist;
      });

      context('renders top element', function () {
        it('successfully', function () {
          const localTopSelector = 'a.result';
          expect(resultElement.querySelector(localTopSelector)).to.exist;
        });

        it('with existing and correct title', function () {
          const localTopTitleSelector = 'a.result div.abstract span.title';
          expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
          expect(resultElement.querySelector(localTopTitleSelector))
            .to.have.text(results[0].snippet.title);
        });

        it('with existing and correct domain', function () {
          const localTopTitleSelector = 'a.result div.abstract span.url';
          expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
          expect(resultElement.querySelector(localTopTitleSelector))
            .to.contain.text(results[0].snippet.friendlyUrl);
        });

        it('with existing logo', function () {
          const localTopLogoSelector = 'a.result div.icons span.logo';
          expect(resultElement.querySelector(localTopLogoSelector)).to.exist;
        });

        it('with a correct link', function () {
          const localTopLinkSelector = 'a.result';
          expect(resultElement.querySelector(localTopLinkSelector).dataset.url)
            .to.equal(results[0].url);
        });

        it('with existing and correct description', function () {
          const localTopDescSelector = 'a.result div.abstract span.description';
          expect(resultElement.querySelector(localTopDescSelector)).to.exist;
          expect(resultElement.querySelector(localTopDescSelector))
            .to.have.text(results[0].snippet.description);
        });
      });

      context('renders deep results buttons', function () {
        const buttonsAreaSelector = 'div.buttons';
        const buttonSelector = 'div.buttons a.btn';
        let buttonsArea;
        let buttonsItems;

        before(function () {
          buttonsArea = resultElement.querySelector(buttonsAreaSelector);
          buttonsItems = resultElement.querySelectorAll(buttonSelector);
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
            expect(link.dataset.url).to.equal(results[0].snippet.deepResults[0].links[i].url);
          });
        });
      });

      context('renders local result', function () {
        const localAreaSelector = 'local-result-wrapper';

        it('successfully', function () {
          expect(localAreaSelector).to.exist;
        });

        it('with existing and correct image', function () {
          const localMapSelector = '.local-map';
          const localMapItem = resultElement.querySelector(localMapSelector);
          expect(localMapItem).to.exist;
          expect(localMapItem.dataset.url).to.equal(results[0].snippet.extra.mu);
        });

        it('with existing and correct address', function () {
          const localAddressSelector = '.local-info .local-address';
          const localAddressItem = resultElement.querySelector(localAddressSelector);
          expect(localAddressItem).to.exist;
          expect(localAddressItem).to.contain.text(results[0].snippet.extra.address);
        });

        it('with existing and correct phone number', function () {
          const localPhoneSelector = '.local-info .local-phone';
          const localPhoneItem = resultElement.querySelector(localPhoneSelector);
          expect(localPhoneItem).to.exist;
          expect(localPhoneItem).to.contain.text(results[0].snippet.extra.phonenumber);
        });
      });
    });
  });
}
