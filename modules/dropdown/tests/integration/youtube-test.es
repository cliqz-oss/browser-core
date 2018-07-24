import {
  blurUrlBar,
  checkButtons,
  checkChildren,
  checkMainResult,
  checkParent,
  $cliqzResults,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsYoutube';

export default function () {
  if (!testsEnabled()) { return; }

  context('for youtube rich header', function () {
    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('youtube');
      await waitForPopup(1);
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${results[0].url}"]`));
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.videos', youtube: true });
    checkButtons({ $result: $cliqzResults, results });
  });
}
