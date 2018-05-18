/* global window */

import {
  blurUrlBar,
  checkMainResult,
  checkParent,
  checkSoccerLigaTable,
  $cliqzResults,
  fillIn,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsSoccerLigaTable';

export default function () {
  context('for soccer liga table results', function () {
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
        fillIn('bundesliga tabelle');
        return waitForPopup(2);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLigaTable({ $result: $cliqzResults, results });
    });

    context('(interactions) after clicking on the "Show more" button', function () {
      before(async function () {
        blurUrlBar();
        respondWith({ results });
        withHistory([]);
        fillIn('bundesliga tabelle');
        await waitForPopup(2);
        $cliqzResults.querySelector('.result.expand-btn').click();
        await waitFor(function () {
          return $cliqzResults.querySelectorAll('.table-row').length !== 6;
        });
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLigaTable({ $result: $cliqzResults, results, isExpanded: true });
    });
  });
}
