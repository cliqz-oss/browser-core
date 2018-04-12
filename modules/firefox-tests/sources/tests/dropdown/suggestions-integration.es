import {
  app,
  blurUrlBar,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  respondWith,
  respondWithSuggestions,
  waitForPopup,
  withHistory } from './helpers';
import { responseCliqz, responseGoogle, response1Google } from './fixtures/resultsSuggestions';

export default function () {
  describe('Query suggestions', function () {
    context('data contain Cliqz suggestions, suggestions turned off', function () {
      const response = responseCliqz;
      let $resultElement;

      before(function () {
        blurUrlBar();
        CliqzUtils.setPref('suggestionChoice', 0);
        respondWith(response);
        withHistory([]);
        fillIn('facebook');
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        });
      });

      after(function () {
        CliqzUtils.clearPref('suggestionChoice');
      });

      it('renders result', function () {
        const resultSelector = `.result[data-url="${response.results[0].url}"]`;
        expect($resultElement).to.contain(resultSelector);
      });

      it('renders logo', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
        const logoSelector = '.icons .logo';
        expect(mainResult).to.contain(logoSelector);
      });

      it('renders title', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
        const titleSelector = '.abstract .title';
        expect(mainResult).to.contain(titleSelector);
        expect(mainResult.querySelector(titleSelector).textContent.trim())
          .to.equal(response.results[0].snippet.title);
      });

      it('renders divider', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
        const dividerSelector = '.abstract .divider';
        expect(mainResult).to.contain(dividerSelector);
        expect(mainResult.querySelector(dividerSelector).textContent.trim()).to.equal('—');
      });

      it('renders url', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
        const urlSelector = '.abstract .url';
        expect(mainResult).to.contain(urlSelector);
        expect(mainResult.querySelector(urlSelector).textContent.trim())
          .to.equal(response.results[0].friendlyUrl);
      });

      it('renders description', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
        const descriptionSelector = '.abstract .description';
        expect(mainResult).to.contain(descriptionSelector);
        expect(mainResult.querySelector(descriptionSelector).textContent.trim())
          .to.equal(response.results[0].snippet.description);
      });

      it('does\'t render query suggestions', function () {
        const suggestionsSelector = '.suggestions';
        expect($resultElement).to.not.contain(suggestionsSelector);
      });
    });

    context('with Cliqz suggestions', function () {
      const response = responseCliqz;
      let $resultElement;

      before(function () {
        blurUrlBar();
        CliqzUtils.setPref('suggestionChoice', 1);
        respondWith(response);
        withHistory([]);
        fillIn('facebook');
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        });
      });

      after(function () {
        CliqzUtils.clearPref('suggestionChoice');
      });

      context('main result', function () {
        it('renders result', function () {
          const resultSelector = `.result[data-url="${response.results[0].url}"]`;
          expect($resultElement).to.contain(resultSelector);
        });

        it('renders logo', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
          const logoSelector = '.icons .logo';
          expect(mainResult).to.contain(logoSelector);
        });

        it('renders title', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
          const titleSelector = '.abstract .title';
          expect(mainResult).to.contain(titleSelector);
          expect(mainResult.querySelector(titleSelector).textContent.trim())
            .to.equal(response.results[0].snippet.title);
        });

        it('renders divider', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
          const dividerSelector = '.abstract .divider';
          expect(mainResult).to.contain(dividerSelector);
          expect(mainResult.querySelector(dividerSelector).textContent.trim()).to.equal('—');
        });

        it('renders url', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
          const urlSelector = '.abstract .url';
          expect(mainResult).to.contain(urlSelector);
          expect(mainResult.querySelector(urlSelector).textContent.trim())
            .to.equal(response.results[0].friendlyUrl);
        });

        it('renders description', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response.results[0].url}"]`);
          const descriptionSelector = '.abstract .description';
          expect(mainResult).to.contain(descriptionSelector);
          expect(mainResult.querySelector(descriptionSelector).textContent.trim())
            .to.equal(response.results[0].snippet.description);
        });
      });

      context('query suggestions', function () {
        it('exist', function () {
          const querySuggestionsSelector = '.suggestions';
          expect($resultElement).to.contain(querySuggestionsSelector);
        });

        it('number of suggestions is three', function () {
          const querySuggestionsSelector = '.suggestions .result';
          expect($resultElement.querySelectorAll(querySuggestionsSelector).length).to.equal(3);
        });

        it('renders search icon for all suggestions', function () {
          const querySuggestionsSelector = '.suggestions .result';
          [...$resultElement.querySelectorAll(querySuggestionsSelector)].forEach(function (object) {
            expect(object).to.contain('.icon.search');
          });
        });

        it('contain right links', function () {
          const querySuggestionsSelector = '.suggestions .result';
          let i;
          for (i = 0; i < 3; i += 1) {
            expect($resultElement.querySelectorAll(querySuggestionsSelector)[i].hasAttribute('data-url'))
              .to.be.true;
            expect($resultElement.querySelectorAll(querySuggestionsSelector)[i].getAttribute('data-url'))
              .to.equal(`https://cliqz.com/search?q=${response.suggestions[i]}`);
          }
        });

        it('renders correct queries for all suggestions', function () {
          const querySuggestionsSelector = '.suggestions .result';
          let i;
          for (i = 0; i < 3; i += 1) {
            expect($resultElement.querySelectorAll(querySuggestionsSelector)[i].textContent.trim())
              .to.equal(response.suggestions[i]);
          }
        });
      });
    });

    context('data contain Google suggestions, suggestions turned off', function () {
      const response = responseGoogle;
      const response1 = response1Google;
      let $resultElement;

      before(function () {
        blurUrlBar();
        CliqzUtils.setPref('suggestionChoice', 0);

        app.modules.search.action('setDefaultSearchEngine', 'Google');
        respondWithSuggestions(response);
        respondWith(response1);
        withHistory([]);
        fillIn('facebook');
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        });
      });

      after(function () {
        CliqzUtils.clearPref('suggestionChoice');
      });

      it('renders result', function () {
        const resultSelector = `.result[data-url="${response1.results[0].url}"]`;
        expect($resultElement).to.contain(resultSelector);
      });

      it('renders logo', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
        const logoSelector = '.icons .logo';
        expect(mainResult).to.contain(logoSelector);
      });

      it('renders title', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
        const titleSelector = '.abstract .title';
        expect(mainResult).to.contain(titleSelector);
        expect(mainResult.querySelector(titleSelector).textContent.trim())
          .to.equal(response1.results[0].snippet.title);
      });

      it('renders divider', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
        const dividerSelector = '.abstract .divider';
        expect(mainResult).to.contain(dividerSelector);
        expect(mainResult.querySelector(dividerSelector).textContent.trim()).to.equal('—');
      });

      it('renders url', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
        const urlSelector = '.abstract .url';
        expect(mainResult).to.contain(urlSelector);
        expect(mainResult.querySelector(urlSelector).textContent.trim())
          .to.equal(response1.results[0].friendlyUrl);
      });

      it('renders description', function () {
        const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
        const descriptionSelector = '.abstract .description';
        expect(mainResult).to.contain(descriptionSelector);
        expect(mainResult.querySelector(descriptionSelector).textContent.trim())
          .to.equal(response1.results[0].snippet.description);
      });

      it('does\'t render query suggestions', function () {
        const resultSelector = '.result';
        expect($resultElement.querySelectorAll(resultSelector).length).to.equal(2);
      });
    });

    context('Google suggestions', function () {
      let $resultElement;
      let response;
      let response1;

      before(function () {
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

        blurUrlBar();
        CliqzUtils.setPref('suggestionChoice', 2);
        app.modules.search.action('setDefaultSearchEngine', 'Google');
        response = addSearchEngineUrls(responseGoogle);
        response1 = addSearchEngineUrls(response1Google);

        respondWithSuggestions(response);
        respondWith(response1);
        withHistory([]);
        fillIn('facebook');
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        });
      });

      after(function () {
        CliqzUtils.clearPref('suggestionChoice');
      });

      context('main result', function () {
        it('renders result', function () {
          const resultSelector = `.result[data-url="${response1.results[0].url}"]`;
          expect($resultElement).to.contain(resultSelector);
        });

        it('renders logo', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
          const logoSelector = '.icons .logo';
          expect(mainResult).to.contain(logoSelector);
        });

        it('renders title', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
          const titleSelector = '.abstract .title';
          expect(mainResult).to.contain(titleSelector);
          expect(mainResult.querySelector(titleSelector).textContent.trim())
            .to.equal(response1.results[0].snippet.title);
        });

        it('renders divider', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
          const dividerSelector = '.abstract .divider';
          expect(mainResult).to.contain(dividerSelector);
          expect(mainResult.querySelector(dividerSelector).textContent.trim()).to.equal('—');
        });

        it('renders url', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
          const urlSelector = '.abstract .url';
          expect(mainResult).to.contain(urlSelector);
          expect(mainResult.querySelector(urlSelector).textContent.trim())
            .to.equal(response1.results[0].friendlyUrl);
        });

        it('renders description', function () {
          const mainResult = $resultElement.querySelector(`.result[data-url="${response1.results[0].url}"]`);
          const descriptionSelector = '.abstract .description';
          expect(mainResult).to.contain(descriptionSelector);
          expect(mainResult.querySelector(descriptionSelector).textContent.trim())
            .to.equal(response1.results[0].snippet.description);
        });
      });

      context('query suggestions', function () {
        it('exist', function () {
          let i;
          for (i = 0; i < 3; i += 1) {
            const querySuggestionsSelector = `.result.search[data-url="${response.results[i + 1].url}"]`;
            expect($resultElement).to.contain(querySuggestionsSelector);
          }
        });

        it('number of suggestions is three', function () {
          const querySuggestionsSelector = `.result.search[data-url="${response.results[4].url}"]`;
          expect($resultElement).to.not.contain(querySuggestionsSelector);
        });

        it('renders search icon for all suggestions', function () {
          let i;
          for (i = 0; i < 3; i += 1) {
            const querySuggestionsSelector = `.result.search[data-url="${response.results[i + 1].url}"]`;
            const iconSelector = '.icon.search';
            expect($resultElement.querySelector(querySuggestionsSelector)).to.contain(iconSelector);
          }
        });

        it('renders correct queries for all suggestions', function () {
          let i;
          for (i = 0; i < 3; i += 1) {
            const querySuggestionsSelector = `.result.search[data-url="${response.results[i + 1].url}"]`;
            const querySelector = '.abstract .strong';
            const result = $resultElement.querySelector(querySuggestionsSelector);
            expect(result).to.contain(querySelector);
            expect(result.querySelector(querySelector).textContent.trim())
              .to.equal(response.results[i + 1].snippet.suggestion);
          }
        });

        it('renders divider for all suggestions', function () {
          let i;
          for (i = 0; i < 3; i += 1) {
            const querySuggestionsSelector = `.result.search[data-url="${response.results[i + 1].url}"]`;
            const dividerSelector = '.abstract .divider';
            const result = $resultElement.querySelector(querySuggestionsSelector);
            expect(result).to.contain(dividerSelector);
            expect(result.querySelector(dividerSelector).textContent.trim()).to.equal('—');
          }
        });

        it('renders "Search with Google" for all suggestions', function () {
          let i;
          for (i = 0; i < 3; i += 1) {
            const querySuggestionsSelector = `.result.search[data-url="${response.results[i + 1].url}"]`;
            const searchWithSelector = '.abstract .url';
            const result = $resultElement.querySelector(querySuggestionsSelector);
            expect(result).to.contain(searchWithSelector);
            expect(result.querySelector(searchWithSelector).textContent.trim())
              .to.equal('Search with Google');
          }
        });
      });
    });
  });
}
