import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  press,
  release,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import expectSelection from './common';
import results from '../fixtures/resultsSoccerLigaTable';

export default function () {
  context('keyboard navigation for soccer table', function () {
    let $resultElement;
    let $searchWithElement;
    let firstElementArray;
    let otherElementsArray;
    let navigationArray;
    const query = 'bundesliga tabelle';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const searchWithSelector = '.result.search';
    const parentSelector = `a.result[data-url="${results[0].url}"]`;
    const soccerTitleSelector = '.result.soccer-title';
    const soccerSelector = '.padded .soccer';

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
            urlBarText: query,
          }
        ];
        otherElementsArray = [
          {
            el: $resultElement.querySelector(parentSelector),
            urlBarText: results[0].url,
          },
          {
            el: $resultElement.querySelector(soccerTitleSelector),
            urlBarText: results[0].snippet.extra.url,
          },
        ];
      });
    });

    it('\'search with\', parent, soccer title, and soccer results were rendered', function () {
      expect($resultElement).to.contain(searchWithSelector);
      expect($resultElement).to.contain(parentSelector);
      expect($resultElement).to.contain(soccerTitleSelector);
      expect($resultElement).to.contain(soccerSelector);
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

    context('navigation with Shift+Tab', function () {
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
  });
}
