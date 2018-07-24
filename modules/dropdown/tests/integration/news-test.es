import {
  blurUrlBar,
  checkButtons,
  checkChildren,
  checkParent,
  $cliqzResults,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsNews';

export default function () {
  if (!testsEnabled()) { return; }

  context('for news rich header', function () {
    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('bild');
      await waitForPopup(1);
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${results[0].url}"]`));
    });

    after(function () {
      window.preventRestarts = false;
    });

    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.news' });
    checkButtons({ $result: $cliqzResults, results });
  });
}
