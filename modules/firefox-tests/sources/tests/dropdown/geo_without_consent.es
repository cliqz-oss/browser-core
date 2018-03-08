/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  getLocaliseString,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import config from '../../../core/config';
import results from './fixtures/resultsGeoWithoutConsent';

export default function () {
  describe('local results', function () {
    context('with "Always ask" settings', function () {
      let $resultElement;
      const query = 'rewe';

      before(function () {
        CliqzUtils.setPref('share_location', 'ask');
        withHistory([]);
        respondWith({ results });
        fillIn(query);
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0].parentNode;
        });
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      it('renders rich header result successfully', function () {
        expect($resultElement).to.exist;
      });

      context('renders parent element', function () {
        it('successfully', function () {
          const localParentSelector = 'a.result';
          expect($resultElement.querySelector(localParentSelector)).to.exist;
        });

        it('with existing and correct title', function () {
          const localParentTitleSelector = 'a.result .abstract .title';
          expect($resultElement.querySelector(localParentTitleSelector)).to.exist;
          expect($resultElement.querySelector(localParentTitleSelector))
            .to.have.text(results[0].snippet.title);
        });

        it('with existing and correct domain', function () {
          const localParentTitleSelector = 'a.result .abstract .url';
          expect($resultElement.querySelector(localParentTitleSelector)).to.exist;
          expect($resultElement.querySelector(localParentTitleSelector))
            .to.contain.text(results[0].snippet.friendlyUrl);
        });

        it('with existing logo', function () {
          const localParentLogoSelector = 'a.result .icons .logo';
          expect($resultElement.querySelector(localParentLogoSelector)).to.exist;
        });

        it('with a correct link', function () {
          const localParentLinkSelector = 'a.result';
          expect($resultElement.querySelector(localParentLinkSelector).href)
            .to.equal(results[0].url);
        });

        it('with existing and correct description', function () {
          const localParentDescSelector = 'a.result .abstract .description';
          expect($resultElement.querySelector(localParentDescSelector)).to.exist;
          expect($resultElement.querySelector(localParentDescSelector))
            .to.have.text(results[0].snippet.description);
        });
      });

      context('renders buttons area', function () {
        const buttonsAreaSelector = '.buttons';
        const buttonSelector = '.buttons .btn';
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

        it('with correct amount of buttons', function () {
          expect(buttonsItems.length).to.equal(2);
        });

        it('with correct text for a button to use location once', function () {
          expect(buttonsItems[0]).to.contain.text(
            getLocaliseString({
              de: 'Ort & Kontakt jetzt anzeigen',
              default: 'Show location & contact now'
            })
          );
        });

        it('with correct text for a button to use location always', function () {
          expect(buttonsItems[1]).to.contain.text(
            getLocaliseString({
              de: 'Immer anzeigen',
              default: 'Always show'
            })
          );
        });
      });
    });

    context('with "Never" settings', function () {
      let $resultElement;
      const query = 'rewe';

      before(function () {
        CliqzUtils.setPref('share_location', 'no');
        withHistory([]);
        respondWith({ results });
        fillIn(query);
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0].parentNode;
        });
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      it('renders rich header result successfully', function () {
        expect($resultElement).to.exist;
      });

      it('does not render buttons area', function () {
        expect($resultElement.querySelectorAll('.buttons')).to.not.exist;
      });

      context('renders parent element', function () {
        it('successfully', function () {
          const localParentSelector = 'a.result';
          expect($resultElement.querySelector(localParentSelector)).to.exist;
        });

        it('with existing and correct title', function () {
          const localParentTitleSelector = 'a.result .abstract .title';
          expect($resultElement.querySelector(localParentTitleSelector)).to.exist;
          expect($resultElement.querySelector(localParentTitleSelector))
            .to.have.text(results[0].snippet.title);
        });

        it('with existing and correct domain', function () {
          const localParentTitleSelector = 'a.result .abstract .url';
          expect($resultElement.querySelector(localParentTitleSelector)).to.exist;
          expect($resultElement.querySelector(localParentTitleSelector))
            .to.contain.text(results[0].snippet.friendlyUrl);
        });

        it('with existing logo', function () {
          const localParentLogoSelector = 'a.result .icons .logo';
          expect($resultElement.querySelector(localParentLogoSelector)).to.exist;
        });

        it('with a correct link', function () {
          const localParentLinkSelector = 'a.result';
          expect($resultElement.querySelector(localParentLinkSelector).href)
            .to.equal(results[0].url);
        });

        it('with existing and correct description', function () {
          const localParentDescSelector = 'a.result .abstract .description';
          expect($resultElement.querySelector(localParentDescSelector)).to.exist;
          expect($resultElement.querySelector(localParentDescSelector))
            .to.have.text(results[0].snippet.description);
        });
      });
    });
  });
}
