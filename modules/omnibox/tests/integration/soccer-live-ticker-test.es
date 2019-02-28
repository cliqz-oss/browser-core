import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  checkParent,
  checkSoccerLiveticker,
  dropdownClick,
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

    context('(interactions)', function () {
      describe('after clicking on the "Show more" button', function () {
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results });
          withHistory([]);
          fillIn('liveticker bundesliga');
          await waitForPopup(1);
          await dropdownClick('.result.expand-btn');
          await waitFor(async function () {
            const $tableRows = await $cliqzResults.querySelectorAll('.table-row');
            return $tableRows.length !== 2;
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
          await waitForPopup(1);
          await dropdownClick('#tab-1');
          await waitFor(async () => {
            const $tab0 = await $cliqzResults.querySelector('#tab-0');
            return $tab0.classList.contains('checked') === false;
          });
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results });
        checkSoccerLiveticker({ $result: $cliqzResults, results, activeTabIdx: 1 });
      });
    });
  });
}
