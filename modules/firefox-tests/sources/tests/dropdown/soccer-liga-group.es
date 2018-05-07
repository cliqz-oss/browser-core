/* global window */

import {
  blurUrlBar,
  checkMainResult,
  checkParent,
  checkSoccerLeague,
  $cliqzResults,
  fillIn,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsSoccerLigaGroup';

export default function () {
  context('for soccer Champions League group results', function () {
    before(function () {
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('(UI)', function () {
      before(function () {
        blurUrlBar();
        respondWith({ results });
        withHistory([]);
        fillIn('Champions league');
        return waitForPopup(2);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLeague({ $result: $cliqzResults, results });
    });

    context('(interactions) after clicking on a different group tab', function () {
      before(async function () {
        blurUrlBar();
        respondWith({ results });
        withHistory([]);
        fillIn('Champions league');
        await waitForPopup(2);
        $cliqzResults.querySelector('#tab-1').click();
        await waitFor(function () {
          return $cliqzResults.querySelector('#tab-0').classList.contains('checked') === false;
        });
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLeague({ $result: $cliqzResults, results, activeTabIdx: 1 });
    });
  });
}
