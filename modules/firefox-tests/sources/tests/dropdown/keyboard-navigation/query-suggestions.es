import {
  app,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  press,
  release,
  respondWith,
  respondWithSuggestions,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import expectSelection from './common';
import { responseCliqz, responseGoogle, response1Google } from '../fixtures/resultsSuggestions';

export default function () {
  context('keyboard navigation for Cliqz suggestions', function () {
    let $resultElement;
    let $searchWithElement;
    let firstElementArray;
    let otherElementsArray;
    let navigationArray;
    const query = 'facebook';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const response = responseCliqz;
    const searchWithSelector = 'a.result.search';
    const result1Selector = `a.result[data-url="${response.results[0].url}"]`;

    beforeEach(function () {
      CliqzUtils.setPref('suggestionChoice', 1);
      withHistory([]);
      respondWith(response);
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
            el: $resultElement.querySelector(result1Selector),
            urlBarText: response.results[0].url,
          },
          {
            el: $resultElement.querySelectorAll('.suggestions .result')[0],
            urlBarText: response.suggestions[0],
          },
          {
            el: $resultElement.querySelectorAll('.suggestions .result')[1],
            urlBarText: response.suggestions[1],
          },
          {
            el: $resultElement.querySelectorAll('.suggestions .result')[2],
            urlBarText: response.suggestions[2],
          },
        ];
      });
    });

    afterEach(function () {
      CliqzUtils.clearPref('suggestionChoice');
    });

    it('\'search with\', normal result, three suggestions were rendered', function () {
      expect($resultElement).to.contain(searchWithSelector);
      expect($resultElement).to.contain(result1Selector);
      expect($resultElement).to.contain('.suggestions');
      expect($resultElement.querySelectorAll('.suggestions .result')).to.have.length(3);
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

  context('keyboard navigation for Google suggestions', function () {
    let $resultElement;
    let $searchWithElement;
    let response;
    let response1;
    let firstElementArray;
    let otherElementsArray;
    let navigationArray;
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const query1 = 'facebook';
    const searchWithSelector = 'a.result.search';

    beforeEach(function () {
      const addSearchEngineUrls = (res) => {
        const getUrl = (query) => {
          const defaultEngine = CliqzUtils.getDefaultSearchEngine();
          return defaultEngine.getSubmissionForQuery(query);
        };

        return {
          ...res,
          results: res.results.map((r) => {
            if (r.template !== 'suggestion') {
              return r;
            }
            return {
              ...r,
              url: getUrl(r.snippet.suggestion),
            };
          }),
        };
      };

      CliqzUtils.setPref('suggestionChoice', 2);
      app.modules.autocomplete.background
        .autocomplete.CliqzResultProviders.setCurrentSearchEngine('Google');

      response = addSearchEngineUrls(responseGoogle);
      response1 = addSearchEngineUrls(response1Google);

      respondWithSuggestions(response);
      respondWith(response1);
      withHistory([]);
      fillIn(query1);
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
        $searchWithElement = $resultElement.querySelector(searchWithSelector);
        firstElementArray = [
          {
            el: $searchWithElement,
            urlBarText: query1,
          },
        ];
        otherElementsArray = [
          {
            el: $resultElement.querySelector(`a.result[data-url="${response1.results[0].url}"]`),
            urlBarText: response1.results[0].url,
          },
          {
            el: $resultElement.querySelector(`.result.search[data-url="${response.results[1].url}"]`),
            urlBarText: response.results[1].snippet.suggestion,
          },
          {
            el: $resultElement.querySelector(`.result.search[data-url="${response.results[2].url}"]`),
            urlBarText: response.results[2].snippet.suggestion,
          },
          {
            el: $resultElement.querySelector(`.result.search[data-url="${response.results[3].url}"]`),
            urlBarText: response.results[3].snippet.suggestion,
          },
        ];
      });
    });

    afterEach(function () {
      CliqzUtils.clearPref('suggestionChoice');
    });

    it('\'search with\', normal result, three suggestions were rendered', function () {
      expect($resultElement).to.contain(searchWithSelector);
      expect($resultElement).to.contain(`a.result[data-url="${response1.results[0].url}"]`);
      expect($resultElement).to.contain(`.result.search[data-url="${response.results[1].url}"]`);
      expect($resultElement).to.contain(`.result.search[data-url="${response.results[2].url}"]`);
      expect($resultElement).to.contain(`.result.search[data-url="${response.results[3].url}"]`);
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
          .then(() => expectSelection($resultElement, $searchWithElement, query1, urlBar));
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
          .then(() => expectSelection($resultElement, $searchWithElement, query1, urlBar));
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
          .then(() => expectSelection($resultElement, $searchWithElement, query1, urlBar));
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
          .then(() => expectSelection($resultElement, $searchWithElement, query1, urlBar));
      });
    });
  });
}
