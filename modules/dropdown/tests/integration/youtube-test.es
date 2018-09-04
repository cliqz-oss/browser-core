import {
  $cliqzResults,
  blurUrlBar,
  checkButtons,
  checkChildren,
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
import results from '../../core/integration/fixtures/resultsYoutube';

export default function () {
  if (!testsEnabled()) { return; }

  context('for youtube rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('youtube');
      await waitForPopup(1);
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${results[0].url}"]`));
    });

    after(() => {
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.videos', youtube: true });
    checkButtons({ $result: $cliqzResults, results });
  });
}
