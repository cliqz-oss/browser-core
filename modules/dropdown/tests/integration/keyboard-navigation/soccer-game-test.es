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
import { soccerResults } from '../fixtures/resultsSoccerLigaGame';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation soccer liga game', function () {
    let $resultElement;
    let $titleElement;
    let $news1Element;
    let $news2Element;
    const results = soccerResults;
    const query = 'fcbayern';
    const resultSelector = `a.result[data-url="${results[0].url}"]`;
    const titleSelector = '.result.soccer-title';
    const soccerSelector = '.padded .soccer';
    const news1Selector = `a.result[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const news2Selector = `a.result[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(resultSelector));
      $resultElement = $cliqzResults.querySelector(resultSelector);
      $titleElement = $cliqzResults.querySelector(titleSelector);
      $news1Element = $cliqzResults.querySelector(news1Selector);
      $news2Element = $cliqzResults.querySelector(news2Selector);
    });

    it('result, soccer title, soccer, 2 news results were rendered', function () {
      expect($resultElement).to.exist;
      expect($titleElement).to.exist;
      expect($news1Element).to.exist;
      expect($news2Element).to.exist;
      expect($cliqzResults.querySelector(soccerSelector)).to.exist;
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($titleElement,
          results[0].snippet.extra.url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($news1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($news2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($news2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($news1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($titleElement,
          results[0].snippet.extra.url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($titleElement,
          results[0].snippet.extra.url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($news1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($news2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($news2Element,
          results[0].snippet.deepResults[0].links[1].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($news1Element,
          results[0].snippet.deepResults[0].links[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($titleElement,
          results[0].snippet.extra.url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($resultElement,
          results[0].snippet.friendlyUrl), 600);
      });
    });
  });
}
