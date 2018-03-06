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
import results from '../fixtures/resultsSoccerLigaGame';

export default function () {
  context('keyboard navigation for soccer liga game', function () {
    let $resultElement;
    let $searchWithElement;
    let firstElementArray;
    let otherElementsArray;
    let navigationArray;
    const query = 'fc bayern';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const searchWithSelector = '.result.search';
    const parentSelector = `a.result[data-url="${results[0].url}"]`;
    const button1Selector = `a.result[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const button2Selector = `a.result[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;
    const button3Selector = `a.result[data-url="${results[0].snippet.deepResults[0].links[2].url}"]`;
    const button4Selector = `a.result[data-url="${results[0].snippet.deepResults[0].links[3].url}"]`;
    const news1Selector = `a.result[data-url="${results[0].snippet.deepResults[1].links[0].url}"]`;
    const news2Selector = `a.result[data-url="${results[0].snippet.deepResults[1].links[1].url}"]`;
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
            el: $resultElement.querySelector(button1Selector),
            urlBarText: results[0].snippet.deepResults[0].links[0].url,
          },
          {
            el: $resultElement.querySelector(button2Selector),
            urlBarText: results[0].snippet.deepResults[0].links[1].url,
          },
          {
            el: $resultElement.querySelector(button3Selector),
            urlBarText: results[0].snippet.deepResults[0].links[2].url,
          },
          {
            el: $resultElement.querySelector(button4Selector),
            urlBarText: results[0].snippet.deepResults[0].links[3].url,
          },
          {
            el: $resultElement.querySelector(soccerTitleSelector),
            urlBarText: results[0].snippet.extra.url,
          },
          {
            el: $resultElement.querySelector(news1Selector),
            urlBarText: results[0].snippet.deepResults[1].links[0].url,
          },
          {
            el: $resultElement.querySelector(news2Selector),
            urlBarText: results[0].snippet.deepResults[1].links[1].url,
          },
        ];
      });
    });

    it('\'search with\', parent, 4 buttons, soccer, 2 news results were rendered', function () {
      expect($resultElement).to.contain(searchWithSelector);
      expect($resultElement).to.contain(parentSelector);
      expect($resultElement).to.contain(soccerTitleSelector);
      expect($resultElement).to.contain(soccerSelector);
      expect($resultElement).to.contain(button1Selector);
      expect($resultElement).to.contain(button2Selector);
      expect($resultElement).to.contain(button3Selector);
      expect($resultElement).to.contain(button4Selector);
      expect($resultElement).to.contain(news1Selector);
      expect($resultElement).to.contain(news2Selector);
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
  });
}
