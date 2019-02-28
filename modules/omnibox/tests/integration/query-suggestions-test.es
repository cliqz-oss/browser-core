import {
  $cliqzResults,
  app,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  prefs,
  respondWithSuggestions,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import response from '../../core/integration/fixtures/resultsSuggestions';

export default function () {
  describe('query suggestions', function () {
    context('data contain suggestions, suggestions turned off', function () {
      before(async function () {
        await blurUrlBar();
        prefs.set('suggestionChoice', 0);
        app.modules.search.action('setDefaultSearchEngine', 'Google');
        respondWithSuggestions(response);
        await mockSearch({ results: [] });
        withHistory([]);
        fillIn('facebook');
        await waitForPopup(0);
        await waitFor(() => $cliqzResults.querySelector('.search'));
      });

      after(function () {
        prefs.clear('suggestionChoice');
      });

      it('renders only search result', async function () {
        const $searchResults = await $cliqzResults.querySelectorAll('.search.result');
        expect($searchResults).to.have.length(1);
      });
    });

    context('data contain suggestions, suggestions turned on', function () {
      before(async function () {
        win.preventRestarts = true;
        await blurUrlBar();
        prefs.set('suggestionChoice', 2);
        await app.modules.search.action('setDefaultSearchEngine', 'Google');
        respondWithSuggestions(response);
        await mockSearch({ results: [] });
        withHistory([]);
        fillIn('facebook');
        await waitForPopup(4);
        await waitFor(async () => {
          const $results = await $cliqzResults.querySelectorAll('.result.search');
          return $results.length > 1;
        });
      });

      after(function () {
        win.preventRestarts = false;
        prefs.clear('suggestionChoice');
      });

      it('"search with" and 4 query suggestions were rendered', async function () {
        const $suggestionsElArray = await $cliqzResults.querySelectorAll('.result.search');
        expect($suggestionsElArray).to.have.length(5);
      });

      it('renders search icon for all suggestions and "search with"', async function () {
        const iconSelector = '.icon.search';
        const $suggestionsElArray = await $cliqzResults.querySelectorAll('.result.search');

        expect($suggestionsElArray.length).to.be.above(0);
        [...$suggestionsElArray].forEach((el) => {
          expect(el.querySelector(iconSelector)).to.exist;
        });
      });

      it('renders correct queries for all suggestions', async function () {
        const querySelector = '.abstract .strong';
        const $suggestionsElArray = await $cliqzResults.querySelectorAll('.result.search');

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

      it('divider exists for all suggestions', async function () {
        const dividerSelector = '.abstract .divider';
        const $suggestionsElArray = await $cliqzResults.querySelectorAll('.result.search');

        expect($suggestionsElArray.length).to.be.above(0);
        [...$suggestionsElArray].forEach((el) => {
          expect(el.querySelector(dividerSelector)).to.exist;
          expect(el.querySelector(dividerSelector).textContent.trim()).to.equal('—');
        });
      });

      it('"Search with Google" exists for all suggestions', async function () {
        const searchWithSelector = '.abstract .url';
        const $suggestionsElArray = await $cliqzResults.querySelectorAll('.result.search');

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
