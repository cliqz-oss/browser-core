import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  checkParent,
  checkSoccerLiveticker,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsSoccerLiveTicker';

export default function () {
  context('for soccer live ticker results', function () {
    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('(UI)', function () {
      before(async function () {
        await blurUrlBar();
        withHistory([]);
        await mockSearch({ results });
        fillIn('liveticker bundesliga');
        await waitForPopup(1);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLiveticker({ $result: $cliqzResults, results });
    });

    xcontext('(interactions)', function () {
      describe('after clicking on the "Show more" button', function () {
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results });
          withHistory([]);
          fillIn('liveticker bundesliga');
          await waitForPopup(1);
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
          await blurUrlBar();
          await mockSearch({ results });
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
