import {
  $cliqzResults,
  blurUrlBar,
  checkButtons,
  checkMainResult,
  checkParent,
  checkSoccerLigaGame,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsSoccerLigaGame';

export default function () {
  if (!testsEnabled()) { return; }

  context('for soccer liga game results', function () {
    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('(UI)', function () {
      before(async function () {
        blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('fc bayern');
        await waitForPopup(2);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkButtons({ $result: $cliqzResults, results });
      checkSoccerLigaGame({ $result: $cliqzResults, results });
    });

    context('(interactions) after clicking on the "Show more" button', function () {
      before(async function () {
        blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('FC Bayer München');
        await waitForPopup(2);
        $cliqzResults.querySelector('.result.expand-btn').click();
        await waitFor(() =>
          $cliqzResults.querySelectorAll('.table-row').length !== 2
        );
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkButtons({ $result: $cliqzResults, results });
      checkSoccerLigaGame({ $result: $cliqzResults, results, isExpanded: true });
    });
  });
}
