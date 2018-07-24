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
  withHistory } from '../helpers';
import expectSelection from './common';
import results from '../fixtures/resultsSoccerLigaGroup';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation soccer liga group', function () {
    let $searchWithElement;
    let $resultElement;
    let $titleElement;
    const query = 'uefa league';
    const searchWithSelector = '.result.search';
    const resultSelector = `a.result[data-url="${results[0].url}"]`;
    const titleSelector = '.result.soccer-title';
    const soccerSelector = '.padded .soccer';

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(resultSelector));
      $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
      $resultElement = $cliqzResults.querySelector(resultSelector);
      $titleElement = $cliqzResults.querySelector(titleSelector);
    });

    it('\'search with\', result, soccer title, and soccer result were rendered', function () {
      expect($searchWithElement).to.exist;
      expect($resultElement).to.exist;
      expect($titleElement).to.exist;
      expect($cliqzResults.querySelector(soccerSelector)).to.exist;
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($resultElement,
          results[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($titleElement,
          results[0].snippet.extra.url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($titleElement,
          results[0].snippet.extra.url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($resultElement,
          results[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($resultElement,
          results[0].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($titleElement,
          results[0].snippet.extra.url), 600);
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
        await waitFor(() => expectSelection($titleElement,
          results[0].snippet.extra.url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($resultElement,
          results[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($searchWithElement,
          query), 600);
      });
    });
  });
}
