import {
  $cliqzResults,
  blurUrlBar,
  checkButtons,
  checkMainResult,
  checkParent,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsBigMachineWithButtons';

export default function () {
  if (!testsEnabled()) { return; }

  context('big machine with buttons', function () {
    before(async function () {
      win.preventRestarts = true;
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn('bing');
      await waitForPopup(1);
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${results[0].url}"]`));
    });

    after(function () {
      blurUrlBar();
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });
    checkButtons({ $result: $cliqzResults, results });
  });
}
