import {
  blurUrlBar,
  checkButtons,
  checkMainResult,
  checkParent,
  $cliqzResults,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsBigMachineWithButtons';

export default function () {
  context('big machine with buttons', function () {
    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      withHistory([]);
      respondWith({ results });
      fillIn('bing');
      await waitForPopup(1);
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
