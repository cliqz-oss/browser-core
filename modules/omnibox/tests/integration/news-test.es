import {
  $cliqzResults,
  blurUrlBar,
  checkButtons,
  checkChildren,
  checkParent,
  fillIn,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsNews';

export default function () {
  context('for news rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('bild');
      await waitForPopup(1);
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.news' });
    checkButtons({ $result: $cliqzResults, results });
  });
}
