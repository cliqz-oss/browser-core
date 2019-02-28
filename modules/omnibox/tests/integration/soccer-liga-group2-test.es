import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  checkParent,
  checkSoccerLeague,
  dropdownClick,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsSoccerLigaGroup2';

export default function () {
  context('for soccer Europa League group results', function () {
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

    context('(interactions) after clicking on a different group tab', function () {
      before(async function () {
        await blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('Champions league');
        await waitForPopup(1);
        await dropdownClick('#tab-1');
        await waitFor(async () => {
          const $tab0 = await $cliqzResults.querySelector('#tab-0');
          return !$tab0.classList.contains('checked');
        });
      });

      checkMainResult({ $result: $cliqzResults });
      checkParent({ $result: $cliqzResults, results });
      checkSoccerLeague({ $result: $cliqzResults, results, activeTabIdx: 1 });
    });
  });
}
