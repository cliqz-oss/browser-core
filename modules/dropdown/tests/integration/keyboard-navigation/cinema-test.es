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
import { notLocalResults } from '../../../core/integration/fixtures/resultsCinema';
import prefs from '../../../../core/prefs';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation cinema', function () {
    let $searchWithElement;
    let $cinemaElement;
    let $resultElement;
    const url = 'https://test-cinema.com';
    const results = notLocalResults.concat([{ url }]);
    const query = 'yorck ';
    const searchWithSelector = 'a.result.search';
    const cinemaSelector = `a.result[data-url="${notLocalResults[0].url}"]`;
    const cinemaMapSelector = '.movie-cinema .padded';
    const cinemaTableTitleSelector = '.showtime-title';
    const cinemaTableSelector = '.show-time.padded';
    const resultSelector = `a.result[data-url="${results[1].url}"]`;

    context('with "never" share location settings', function () {
      beforeEach(async function () {
        blurUrlBar();
        prefs.set('share_location', 'no');
        withHistory([]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(3);
        await waitFor(() => $cliqzResults.querySelector(resultSelector));
        $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
        $cinemaElement = $cliqzResults.querySelector(cinemaSelector);
        $resultElement = $cliqzResults.querySelector(resultSelector);
      });

      it('\'search with\', result and cinema result were rendered', function () {
        expect($searchWithElement).to.exist;
        expect($resultElement).to.exist;
        expect($cinemaElement).to.exist;
        expect($cliqzResults.querySelector(cinemaTableSelector)).to.exist;
        expect($cliqzResults.querySelector(cinemaTableTitleSelector)).to.exist;
        expect($cliqzResults.querySelector(cinemaMapSelector)).to.exist;
      });

      context('navigate with arrowDown', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'ArrowDown' });
          await waitFor(() => expectSelection($cinemaElement,
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
          await waitFor(() => expectSelection($cinemaElement,
            results[0].url), 600);
          press({ key: 'ArrowUp' });
          await waitFor(() => expectSelection($searchWithElement,
            query), 600);
        });
      });

      context('navigate with Tab', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'Tab' });
          await waitFor(() => expectSelection($cinemaElement,
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
          await waitFor(() => expectSelection($cinemaElement,
            results[0].url), 600);
          press({ key: 'Tab', shiftKey: true });
          await waitFor(() => expectSelection($searchWithElement,
            query), 600);
        });
      });
    });
    context('with "always" share location settings', function () {
      beforeEach(async function () {
        blurUrlBar();
        prefs.set('share_location', 'yes');
        withHistory([]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(3);
        await waitFor(() => $cliqzResults.querySelector(resultSelector));
        $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
        $cinemaElement = $cliqzResults.querySelector(cinemaSelector);
        $resultElement = $cliqzResults.querySelector(resultSelector);
      });

      it('\'search with\', result and cinema result were rendered', function () {
        expect($searchWithElement).to.exist;
        expect($resultElement).to.exist;
        expect($cinemaElement).to.exist;
        expect($cliqzResults.querySelector(cinemaTableSelector)).to.exist;
        expect($cliqzResults.querySelector(cinemaTableTitleSelector)).to.exist;
        expect($cliqzResults.querySelector(cinemaMapSelector)).to.exist;
      });

      context('navigate with arrowDown', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'ArrowDown' });
          await waitFor(() => expectSelection($cinemaElement,
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
          await waitFor(() => expectSelection($cinemaElement,
            results[0].url), 600);
          press({ key: 'ArrowUp' });
          await waitFor(() => expectSelection($searchWithElement,
            query), 600);
        });
      });

      context('navigate with Tab', function () {
        it('selected element and urlbar value are correct', async function () {
          press({ key: 'Tab' });
          await waitFor(() => expectSelection($cinemaElement,
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
          await waitFor(() => expectSelection($cinemaElement,
            results[0].url), 600);
          press({ key: 'Tab', shiftKey: true });
          await waitFor(() => expectSelection($searchWithElement,
            query), 600);
        });
      });
    });
  });
}
