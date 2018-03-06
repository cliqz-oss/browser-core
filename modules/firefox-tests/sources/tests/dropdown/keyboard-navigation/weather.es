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
import { weatherResults } from '../fixtures/resultsWeather';

export default function () {
  context('keyboard navigation for weather', function () {
    let resultElement;
    let searchWithElement;
    let navigationArray = [];
    const query = 'weather mun';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const results = weatherResults;
    const searchWithSelector = 'a.result.search';
    const weatherSelector = '.result.weather';
    const normalSelector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(function () {
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
        searchWithElement = resultElement.querySelector(searchWithSelector);
        navigationArray = [
          {
            el: searchWithElement,
            urlBarText: query
          },
          {
            el: resultElement.querySelector(normalSelector),
            urlBarText: results[1].url
          }
        ];
      });
    });

    it('"search with", weather result, and normal result were rendered', function () {
      expect(resultElement).to.contain(searchWithSelector);
      expect(resultElement).to.contain(weatherSelector);
      expect(resultElement).to.contain(normalSelector);
    });

    context('navigation with arrowDown', function () {
      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection(resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'ArrowDown' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection(resultElement, searchWithElement, query, urlBar));
      });
    });

    context('navigation with arrowUp', function () {
      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection(resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'ArrowUp' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection(resultElement, searchWithElement, query, urlBar));
      });
    });

    context('navigation with Tab', function () {
      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection(resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'Tab' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection(resultElement, searchWithElement, query, urlBar));
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
              expectSelection(resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'Tab', shiftKey: true });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection(resultElement, searchWithElement, query, urlBar));
      });
    });
  });
}
