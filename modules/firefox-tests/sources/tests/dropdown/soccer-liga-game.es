/* global window */

import {
  blurUrlBar,
  $cliqzResults,
  checkButtons,
  checkMainResult,
  checkParent,
  checkSoccerLigaGame,
  fillIn,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsSoccerLigaGame';

export default function () {
  context('for soccer liga game results', function () {
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
        fillIn('fc bayern');
        return waitForPopup(2);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkButtons({ $result: $cliqzResults, results });
      checkSoccerLigaGame({ $result: $cliqzResults, results });
    });

    context('(interactions) after clicking on the "Show more" button', function () {
      before(async function () {
        blurUrlBar();
        respondWith({ results });
        withHistory([]);
        fillIn('FC Bayer München');
        await waitForPopup(2);
        $cliqzResults.querySelector('.result.expand-btn').click();
        await waitFor(function () {
          return $cliqzResults.querySelectorAll('.table-row').length !== 2;
        });
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkButtons({ $result: $cliqzResults, results });
      checkSoccerLigaGame({ $result: $cliqzResults, results, isExpanded: true });
    });
  });
}
