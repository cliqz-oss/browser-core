import {
  blurUrlBar,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  press,
  pressAndWaitFor,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import { explicitAndSimpleResults } from '../fixtures/resultsAdultQuestion';

export default function () {
  context('keyboard navigation for adult question', function () {
    let $resultElement;
    let $showOnceButton;
    let $alwaysButton;
    let $neverButton;
    const results = explicitAndSimpleResults;
    const query = 'po';
    const searchWithSelector = '.result.search';
    const questionSelector = '.result.adult-question';
    const showOnceSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"allowOnce"}\']';
    const alwaysSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"block"}\']';
    const neverSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"allow"}\']';
    const adult1Selector = `a.result[data-url="${results[0].url}"]`;
    const adult2Selector = `a.result[data-url="${results[1].url}"]`;
    const normalSelector = `a.result[data-url="${results[2].url}"]`;

    beforeEach(function () {
      blurUrlBar();
      CliqzUtils.setPref('adultContentFilter', 'moderate');
      withHistory({});
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      });
    });

    afterEach(function () {
      CliqzUtils.setPref('adultContentFilter', 'moderate');
    });

    it('renders "search with", question, and normal result', function () {
      expect($resultElement).to.contain(searchWithSelector);
      expect($resultElement).to.contain(questionSelector);
      expect($resultElement).to.contain(showOnceSelector);
      expect($resultElement).to.contain(alwaysSelector);
      expect($resultElement).to.contain(neverSelector);
      expect($resultElement).to.contain(normalSelector);
    });

    context('navigate to "Show once" and press Enter', function () {
      beforeEach(function () {
        $showOnceButton = $resultElement.querySelector(showOnceSelector);
        return pressAndWaitFor({ key: 'ArrowDown' }, () =>
          $showOnceButton.classList.contains('selected'))
          .then(function () {
            press({ key: 'Enter' });
            return waitFor(function () {
              $resultElement = $cliqzResults()[0];
              return $resultElement.querySelectorAll('.btn').length === 0;
            });
          });
      });

      it('"search with", two adult results, and normal result were rendered', function () {
        expect($resultElement.querySelector(adult1Selector)).to.exist;
        expect($resultElement.querySelector(adult2Selector)).to.exist;
        expect($resultElement.querySelector(normalSelector)).to.exist;
      });
    });

    context('navigate to "Always" and press Enter', function () {
      beforeEach(function () {
        $showOnceButton = $resultElement.querySelector(showOnceSelector);
        $alwaysButton = $resultElement.querySelector(alwaysSelector);
        return pressAndWaitFor({ key: 'ArrowDown' }, () =>
          $showOnceButton.classList.contains('selected'))
          .then(function () {
            pressAndWaitFor({ key: 'ArrowDown' }, () =>
              $alwaysButton.classList.contains('selected'));
          })
          .then(function () {
            press({ key: 'Enter' });
            return waitFor(function () {
              $resultElement = $cliqzResults()[0];
              return $resultElement.querySelectorAll('.btn').length === 0;
            });
          });
      });

      it('"search with", and normal result were rendered', function () {
        expect($resultElement).to.contain(normalSelector);
      });
    });

    context('navigate to "Never" and press Enter', function () {
      beforeEach(function () {
        $showOnceButton = $resultElement.querySelector(showOnceSelector);
        $alwaysButton = $resultElement.querySelector(alwaysSelector);
        $neverButton = $resultElement.querySelector(neverSelector);
        return pressAndWaitFor({ key: 'ArrowDown' }, () =>
          $showOnceButton.classList.contains('selected'))
          .then(function () {
            pressAndWaitFor({ key: 'ArrowDown' }, () =>
              $alwaysButton.classList.contains('selected'));
          })
          .then(function () {
            pressAndWaitFor({ key: 'ArrowDown' }, () =>
              $neverButton.classList.contains('selected'));
          })
          .then(function () {
            press({ key: 'Enter' });
            return waitFor(function () {
              $resultElement = $cliqzResults()[0];
              return $resultElement.querySelectorAll('.btn').length === 0;
            });
          });
      });

      it('"search with", two adult results, and normal result were rendered', function () {
        expect($resultElement).to.contain(adult1Selector);
        expect($resultElement).to.contain(adult2Selector);
        expect($resultElement).to.contain(normalSelector);
      });
    });
  });
}
