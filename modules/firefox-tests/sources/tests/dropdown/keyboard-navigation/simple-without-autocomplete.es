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
import { results } from '../fixtures/resultsTwoSimpleWithoutAutocomplete';

export default function () {
  context('keyboard navigation for two simple results without autocomplete', function () {
    let $resultElement;
    let $searchWithElement;
    let firstElementArray;
    let otherElementsArray;
    let navigationArray;
    const query = 'qws';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const popup = win.CLIQZ.Core.popup;
    const searchWithSelector = 'a.result.search';
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(function () {
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
        $searchWithElement = $resultElement.querySelector(searchWithSelector);
        firstElementArray = [
          {
            el: $searchWithElement,
            urlBarText: query
          }
        ];
        otherElementsArray = [
          {
            el: $resultElement.querySelector(result1Selector),
            urlBarText: results[0].url
          },
          {
            el: $resultElement.querySelector(result2Selector),
            urlBarText: results[1].url
          }
        ];
      });
    });

    it('\'search with\' and two results were rendered', function () {
      expect($resultElement).to.contain(searchWithSelector);
      expect($resultElement).to.contain(result1Selector);
      expect($resultElement).to.contain(result2Selector);
    });

    it('\'search with\' is visible', function () {
      expect(win.getComputedStyle($resultElement.querySelector('.result.search .abstract .url'))
        .visibility).to.equal('visible');
    });

    context('navigation with arrowDown', function () {
      beforeEach(function () {
        navigationArray = firstElementArray.concat(otherElementsArray);
      });

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
          .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
      });
    });

    context('navigation with arrowUp', function () {
      beforeEach(function () {
        // slice().reverse() creates a new array with the elements in reverse order
        navigationArray = firstElementArray.concat(otherElementsArray.slice().reverse());
      });

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
          .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
      });
    });

    context('navigation with Tab', function () {
      beforeEach(function () {
        navigationArray = firstElementArray.concat(otherElementsArray);
      });

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
          .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
      });
    });

    context('navigation with Shift + Tab', function () {
      beforeEach(function () {
        // slice().reverse() creates a new array with the elements in reverse order
        navigationArray = firstElementArray.concat(otherElementsArray.slice().reverse());
      });

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
          .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
      });
    });

    context('first press arrowLeft', function () {
      beforeEach(function () {
        return pressAndWaitFor({ key: 'ArrowLeft' }, () =>
          popup.mPopupOpen === false);
      });

      it('query is in the url bar, cursor is at the right place', function () {
        expect(urlBar.textValue).to.equal(query);
        expect(urlBar.selectionStart).to.equal(query.length - 1);
        expect(urlBar.selectionEnd).to.equal(query.length - 1);
      });

      context('then press arrowDown', function () {
        beforeEach(function () {
          press({ key: 'ArrowDown' });
          return waitForPopup().then(function () {
            $resultElement = $cliqzResults()[0];
          });
        });

        it('cursor moved to the end of the string', function () {
          expect(urlBar.selectionStart).to.equal(query.length);
          expect(urlBar.selectionEnd).to.equal(query.length);
        });

        it('\'search with\' and two results were rendered', function () {
          expect($resultElement).to.contain(searchWithSelector);
          expect($resultElement).to.contain(result1Selector);
          expect($resultElement).to.contain(result2Selector);
        });

        it('only \'search with\' result is selected', function () {
          expect($resultElement.querySelector(searchWithSelector))
            .to.have.class('selected');
          expect($resultElement.querySelectorAll('.selected')).to.have.length(1);
        });
      });
    });

    context('first press arrowRight', function () {
      beforeEach(function () {
        return pressAndWaitFor({ key: 'ArrowRight' }, () =>
          popup.mPopupOpen === false);
      });

      it('query is in the url bar, cursor is at the right place', function () {
        expect(urlBar.textValue).to.equal(query);
        expect(urlBar.selectionStart).to.equal(query.length);
        expect(urlBar.selectionEnd).to.equal(query.length);
      });

      context('then press arrowDown', function () {
        beforeEach(function () {
          press({ key: 'ArrowDown' });
          return waitForPopup().then(function () {
            $resultElement = $cliqzResults()[0];
          });
        });

        it('\'search with\' and two results were rendered', function () {
          expect($resultElement).to.contain(searchWithSelector);
          expect($resultElement).to.contain(result1Selector);
          expect($resultElement).to.contain(result2Selector);
        });

        it('only \'search with\' result is selected', function () {
          expect($resultElement.querySelector(searchWithSelector))
            .to.have.class('selected');
          expect($resultElement.querySelectorAll('.selected')).to.have.length(1);
        });
      });
    });
  });
}
