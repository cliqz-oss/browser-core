/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  press,
  pressAndWaitFor,
  release,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import expectSelection from './common';
import { results, resultsNew, friendlyUrl } from '../fixtures/resultsTwoSimple';

export default function () {
  context('keyboard navigation for two simple results with autocomplete', function () {
    let $resultElement;
    let $result1Element;
    let navigationArray;
    const query = 'ro';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const popup = win.CLIQZ.Core.popup;
    const result1Selector = `a.result[href="${results[0].url}"]`;
    const result2Selector = `a.result[href="${results[1].url}"]`;

    beforeEach(function () {
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
        $result1Element = $resultElement.querySelector(result1Selector);
        navigationArray = [
          {
            el: $result1Element,
            urlBarText: friendlyUrl[results[0].url]
          },
          {
            el: $resultElement.querySelector(result2Selector),
            urlBarText: results[1].url
          }
        ];
      });
    });

    it('two results were rendered', function () {
      // probably bug is in new mixer
      expect($resultElement).to.contain(result1Selector);
      expect($resultElement).to.contain(result2Selector);
    });

    context('navigation with arrowDown', function () {
      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'ArrowDown' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $result1Element, results[0].url, urlBar));
      });
    });

    context('navigation with arrowUp', function () {
      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'ArrowUp' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $result1Element, results[0].url, urlBar));
      });
    });

    context('navigation with Tab', function () {
      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'Tab' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $result1Element, results[0].url, urlBar));
      });
    });

    context('navigation with Shift + Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'Tab', shiftKey: true });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $result1Element, results[0].url, urlBar));
      });
    });

    context('first press arrowLeft', function () {
      beforeEach(function () {
        return pressAndWaitFor({ key: 'ArrowLeft' }, () =>
          popup.mPopupOpen === false);
      });

      it('there is autocompleted link in url bar', function () {
        expect(urlBar.textValue).to.equal(friendlyUrl[results[0].url]);
      });

      it('cursor is at the right place', function () {
        expect(urlBar.selectionStart).to.equal(query.length);
        expect(urlBar.selectionEnd).to.equal(query.length);
      });

      context('then press arrowDown', function () {
        const newResultSelector = `a.result[href="${resultsNew[0].url}"]`;
        beforeEach(function () {
          withHistory([]);
          respondWith({ results: resultsNew });
          press({ key: 'ArrowDown' });
          return waitForPopup().then(function () {
            $resultElement = $cliqzResults()[0];
          });
        });

        it('cursor is moved to the end of the string', function () {
          expect(urlBar.selectionStart).to.equal(friendlyUrl[results[0].url].length);
          expect(urlBar.selectionEnd).to.equal(friendlyUrl[results[0].url].length);
        });

        it('new result was rendered', function () {
          expect($resultElement.querySelectorAll('.result')).to.have.length(1);
          expect($resultElement).to.contain(`a.result[href="${resultsNew[0].url}"]`);
        });

        it('this new result is selected', function () {
          const newResultElement = $resultElement.querySelector(newResultSelector);
          expect(newResultElement).to.have.class('selected');
          expect($resultElement.querySelectorAll('.selected')).to.have.length(1);
        });
      });
    });

    context('first press arrowRight', function () {
      beforeEach(function () {
        press({ key: 'ArrowRight' });
        return waitFor(function () {
          return popup.mPopupOpen === false;
        });
      });

      it('there is autocompleted link in url bar', function () {
        expect(urlBar.textValue).to.equal(friendlyUrl[results[0].url]);
      });

      it('cursor is at the right place', function () {
        expect(urlBar.selectionStart).to.equal(friendlyUrl[results[0].url].length);
        expect(urlBar.selectionEnd).to.equal(friendlyUrl[results[0].url].length);
      });

      context('then press arrowDown', function () {
        const newResultSelector = `a.result[href="${resultsNew[0].url}"]`;
        beforeEach(function () {
          withHistory([]);
          respondWith({ results: resultsNew });
          press({ key: 'ArrowDown' });
          return waitForPopup().then(function () {
            $resultElement = $cliqzResults()[0];
          });
        });

        it('new result was rendered', function () {
          expect($resultElement.querySelectorAll('.result')).to.have.length(1);
          expect($resultElement).to.contain(newResultSelector);
        });

        it('this new result is selected', function () {
          const newResultElement = $resultElement.querySelector(newResultSelector);
          expect(newResultElement).to.have.class('selected');
          expect($resultElement.querySelectorAll('.selected')).to.have.length(1);
        });
      });
    });
  });
}
