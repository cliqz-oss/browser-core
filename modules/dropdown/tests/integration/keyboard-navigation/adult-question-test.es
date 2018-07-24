import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  press,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import { explicitAndSimpleResults } from '../fixtures/resultsAdultQuestion';
import prefs from '../../../../core/prefs';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation adult question', function () {
    let $showOnceButton;
    let $alwaysButton;
    let $neverButton;
    const results = explicitAndSimpleResults;
    const query = 'po ';
    const searchWithSelector = '.result.search';
    const questionSelector = '.result.adult-question';
    const showOnceSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"allowOnce"}\']';
    const alwaysSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"block"}\']';
    const neverSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"allow"}\']';
    const adult1Selector = `a.result[data-url="${results[0].url}"]`;
    const adult2Selector = `a.result[data-url="${results[1].url}"]`;
    const resultSelector = `a.result[data-url="${results[2].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      prefs.set('adultContentFilter', 'moderate');
      withHistory([]);
      await mockSearch({ results: explicitAndSimpleResults });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector('.buttons'));
      $showOnceButton = $cliqzResults.querySelector(showOnceSelector);
      $alwaysButton = $cliqzResults.querySelector(alwaysSelector);
      $neverButton = $cliqzResults.querySelector(neverSelector);
    });

    afterEach(function () {
      prefs.set('adultContentFilter', 'moderate');
    });

    it('renders question with buttons and normal result', function () {
      expect($cliqzResults.querySelector(searchWithSelector)).to.exist;
      expect($cliqzResults.querySelector(questionSelector)).to.exist;
      expect($cliqzResults.querySelector(resultSelector)).to.exist;
      expect($showOnceButton).to.exist;
      expect($alwaysButton).to.exist;
      expect($neverButton).to.exist;
      expect($cliqzResults.querySelector(adult1Selector)).to.not.exist;
      expect($cliqzResults.querySelector(adult2Selector)).to.not.exist;
    });

    context('navigate to "Show once" button', function () {
      beforeEach(async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => $showOnceButton.classList.contains('selected'));
      });

      it('press "Enter" -> two adult and normal results were rendered', async function () {
        press({ key: 'Enter' });
        await waitFor(() => {
          expect($cliqzResults.querySelector(adult1Selector)).to.exist;
          expect($cliqzResults.querySelector(adult2Selector)).to.exist;
          return expect($cliqzResults.querySelector(resultSelector)).to.exist;
        }, 500);
      });
    });

    context('navigate to "Always" button', function () {
      beforeEach(async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => $showOnceButton.classList.contains('selected'));
        press({ key: 'ArrowDown' });
        await waitFor(() => $alwaysButton.classList.contains('selected'));
      });

      it('press "Enter" -> only normal result was rendered', async function () {
        press({ key: 'Enter' });
        await waitFor(() => {
          expect($cliqzResults.querySelector(adult1Selector)).to.not.exist;
          expect($cliqzResults.querySelector(adult2Selector)).to.not.exist;
          return expect($cliqzResults.querySelector(resultSelector)).to.exist;
        }, 500);
      });
    });

    context('navigate to "Never" button', function () {
      beforeEach(async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => $showOnceButton.classList.contains('selected'));
        press({ key: 'ArrowDown' });
        await waitFor(() => $alwaysButton.classList.contains('selected'));
        press({ key: 'ArrowDown' });
        await waitFor(() => $neverButton.classList.contains('selected'));
      });

      it('press "Enter" -> two adult and normal results were rendered', async function () {
        press({ key: 'Enter' });
        await waitFor(() => {
          expect($cliqzResults.querySelector(adult1Selector)).to.exist;
          expect($cliqzResults.querySelector(adult2Selector)).to.exist;
          return expect($cliqzResults.querySelector(resultSelector)).to.exist;
        }, 500);
      });
    });
  });
}
