/* global window */

import {
  blurUrlBar,
  checkMainResult,
  checkParent,
  checkSoccerLiveticker,
  $cliqzResults,
  fillIn,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsSoccerLiveTicker';

export default function () {
  context('for soccer live ticker results', function () {
    before(function () {
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('(UI)', function () {
      before(function () {
        blurUrlBar();
        withHistory([]);
        respondWith({ results });
        fillIn('liveticker bundesliga');
        return waitForPopup(2);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLiveticker({ $result: $cliqzResults, results });
    });

    context('(interactions)', function () {
      describe('after clicking on the "Show more" button', function () {
        before(async function () {
          blurUrlBar();
          respondWith({ results });
          withHistory([]);
          fillIn('liveticker bundesliga');
          await waitForPopup(2);
          $cliqzResults.querySelector('.result.expand-btn').click();
          await waitFor(function () {
            return $cliqzResults.querySelectorAll('.table-row').length !== 2;
          });
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results });
        checkSoccerLiveticker({ $result: $cliqzResults, results, isExpanded: true });
      });

      describe('after clicking on a different week tab', function () {
        before(async function () {
          blurUrlBar();
          respondWith({ results });
          withHistory([]);
          fillIn('liveticker bundesliga');
          await waitForPopup(2);
          $cliqzResults.querySelector('#tab-1').click();
          await waitFor(function () {
            return $cliqzResults.querySelector('#tab-0').classList.contains('checked') === false;
          });
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results });
        checkSoccerLiveticker({ $result: $cliqzResults, results, activeTabIdx: 1 });
      });
    });
  });
}
