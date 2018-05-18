/* global window */

import {
  blurUrlBar,
  checkhistoryResult,
  $cliqzResults,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsHistoryAndNews';
import historyResults from './fixtures/historyResultsHistoryAndNews';

export default function () {
  context('for history and news rich header', function () {
    before(function () {
      window.preventRestarts = true;
      blurUrlBar();
      respondWith({ results });
      withHistory(historyResults);
      fillIn('cliqz');
      return waitForPopup(4);
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
