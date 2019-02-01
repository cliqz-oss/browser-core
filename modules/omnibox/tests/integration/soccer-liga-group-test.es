import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  checkParent,
  checkSoccerLeague,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsSoccerLigaGroup';

export default function () {
  context('for soccer Champions League group results', function () {
    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('(UI)', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('Champions league');
        await waitForPopup(1);
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLeague({ $result: $cliqzResults, results });
    });

    xcontext('(interactions) after clicking on a different group tab', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('Champions league');
        await waitForPopup(1);
        $cliqzResults.querySelector('#tab-1').click();
        await waitFor(() =>
          !$cliqzResults.querySelector('#tab-0').classList.contains('checked'));
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLeague({ $result: $cliqzResults, results, activeTabIdx: 1 });
    });
  });
}
