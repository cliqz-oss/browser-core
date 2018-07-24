/* global window */

import {
  blurUrlBar,
  checkhistoryResult,
  $cliqzResults,
  fillIn,
  mockSearch,
  testsEnabled,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsHistoryAndNews';
import historyResults from './fixtures/historyResultsHistoryAndNews';

export default function () {
  if (!testsEnabled()) { return; }

  context('for history and news rich header', function () {
    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory(historyResults);
      fillIn('cliqz');
      await waitForPopup(4);
    });

    after(function () {
      window.preventRestarts = false;
    });

    checkhistoryResult({
      $result: $cliqzResults,
      historyResults,
      isPresent: true
    });
  });
}
