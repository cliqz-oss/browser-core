/* global window */

import {
  blurUrlBar,
  checkMainResult,
  checkParent,
  checkSoccerLeague,
  $cliqzResults,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsSoccerLigaGroup';

export default function () {
  if (!testsEnabled()) { return; }

  context('for soccer Champions League group results', function () {
    before(function () {
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('(UI)', function () {
      before(async function () {
        blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('Champions league');
        await waitForPopup(2);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLeague({ $result: $cliqzResults, results });
    });

    context('(interactions) after clicking on a different group tab', function () {
      before(async function () {
        blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('Champions league');
        await waitForPopup(2);
        $cliqzResults.querySelector('#tab-1').click();
        await waitFor(() =>
          !$cliqzResults.querySelector('#tab-0').classList.contains('checked')
        );
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLeague({ $result: $cliqzResults, results, activeTabIdx: 1 });
    });
  });
}
