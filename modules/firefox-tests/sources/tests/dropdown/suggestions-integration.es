import {
  app,
  blurUrlBar,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  respondWith,
  respondWithSuggestions,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import response from './fixtures/resultsSuggestions';

export default function () {
  describe('query suggestions', function () {
    context('data contain suggestions, suggestions turned off', function () {
      before(async function () {
        blurUrlBar();
        CliqzUtils.setPref('suggestionChoice', 0);
        app.modules.search.action('setDefaultSearchEngine', 'Google');
        respondWithSuggestions(response);
        respondWith({ results: [] });
        withHistory([]);
        fillIn('facebook');
        await waitForPopup(1);
        await waitFor(() => $cliqzResults.querySelector('.search') !== null);
      });

      after(function () {
        CliqzUtils.clearPref('suggestionChoice');
      });

      it('renders only search result', function () {
        expect($cliqzResults.querySelectorAll('.search.result')).to.have.length(1);
      });
    });

    context('data contain suggestions, suggestions turned on', function () {
      before(async function () {
        window.preventRestarts = true;
        blurUrlBar();
        CliqzUtils.setPref('suggestionChoice', 2);
        app.modules.search.action('setDefaultSearchEngine', 'Google');
        respondWithSuggestions(response);
        respondWith({ results: [] });
        withHistory([]);
        fillIn('facebook');
        await waitForPopup(5);
        await waitFor(() => $cliqzResults.querySelectorAll('.result.search').length > 1);
      });

      after(function () {
        window.preventRestarts = false;
        CliqzUtils.clearPref('suggestionChoice');
      });

      it('"search with" and 4 query suggestions were rendered', function () {
        const $suggestionsElArray = $cliqzResults.querySelectorAll('.result.search');
        expect($suggestionsElArray).to.have.length(5);
      });

      it('renders search icon for all suggestions and "search with"', function () {
        const iconSelector = '.icon.search';
        const $suggestionsElArray = $cliqzResults.querySelectorAll('.result.search');

        expect($suggestionsElArray.length).to.be.above(0);
        [...$suggestionsElArray].forEach((el) => {
          expect(el.querySelector(iconSelector)).to.exist;
        });
      });

      it('renders correct queries for all suggestions', function () {
        const querySelector = '.abstract .strong';
        const $suggestionsElArray = $cliqzResults.querySelectorAll('.result.search');

        expect($suggestionsElArray.length).to.be.above(0);
        [...$suggestionsElArray].forEach((el, ind) => {
          expect(el.querySelector(querySelector)).to.exist;
          // test queries only for suggestions
          if (ind > 0) {
            expect(el.querySelector(querySelector).textContent.trim())
              .to.equal(response.results[ind - 1]);
          }
        });
      });

      it('divider exists for all suggestions', function () {
        const dividerSelector = '.abstract .divider';
        const $suggestionsElArray = $cliqzResults.querySelectorAll('.result.search');

        expect($suggestionsElArray.length).to.be.above(0);
        [...$suggestionsElArray].forEach((el) => {
          expect(el.querySelector(dividerSelector)).to.exist;
          expect(el.querySelector(dividerSelector).textContent.trim()).to.equal('—');
        });
      });

      it('"Search with Google" exists for all suggestions', function () {
        const searchWithSelector = '.abstract .url';
        const $suggestionsElArray = $cliqzResults.querySelectorAll('.result.search');

        expect($suggestionsElArray.length).to.be.above(0);
        [...$suggestionsElArray].forEach((el) => {
          expect(el.querySelector(searchWithSelector)).to.exist;
          expect(el.querySelector(searchWithSelector).textContent.trim())
            .to.equal('Search with Google');
        });
      });
    });
  });
}
