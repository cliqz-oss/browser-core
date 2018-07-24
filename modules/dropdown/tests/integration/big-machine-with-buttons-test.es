import {
  blurUrlBar,
  checkButtons,
  checkMainResult,
  checkParent,
  $cliqzResults,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsBigMachineWithButtons';

export default function () {
  if (!testsEnabled()) { return; }

  context('big machine with buttons', function () {
    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn('bing');
      await waitForPopup(1);
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${results[0].url}"]`));
    });

    after(function () {
      blurUrlBar();
      window.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });
    checkButtons({ $result: $cliqzResults, results });
  });
}
