import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  press,
  release,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import expectSelection from './common';
import movieResults from '../../../core/integration/fixtures/resultsMovie';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation movie', function () {
    let $searchWithElement;
    let $movieElement;
    let $resultElement;
    const url = 'https://test-movie.com';
    const results = movieResults.concat([{ url }]);
    const query = 'imdb the circle';
    const searchWithSelector = '.result.search';
    const movieSelector = `a.result[data-url="${results[0].url}"]`;
    const movieTableSelector = '.movie-cinema .padded';
    const resultSelector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup(3);
      await waitFor(() => $cliqzResults.querySelector(resultSelector));
      $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
      $resultElement = $cliqzResults.querySelector(resultSelector);
      $movieElement = $cliqzResults.querySelector(movieSelector);
    });

    it('\'search with\', result and movie result were rendered', function () {
      expect($searchWithElement).to.exist;
      expect($resultElement).to.exist;
      expect($movieElement).to.exist;
      expect($cliqzResults.querySelector(movieTableSelector)).to.exist;
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($movieElement,
          results[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($resultElement,
          results[1].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($resultElement,
          results[1].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($movieElement,
          results[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($movieElement,
          results[0].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($resultElement,
          results[1].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($resultElement,
          results[1].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($movieElement,
          results[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });
  });
}
