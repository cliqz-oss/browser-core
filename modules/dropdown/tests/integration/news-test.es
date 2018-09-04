import {
  $cliqzResults,
  blurUrlBar,
  checkButtons,
  checkChildren,
  checkParent,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsNews';

export default function () {
  if (!testsEnabled()) { return; }

  context('for news rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('bild');
      await waitForPopup(1);
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${results[0].url}"]`));
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.news' });
    checkButtons({ $result: $cliqzResults, results });
  });
}
