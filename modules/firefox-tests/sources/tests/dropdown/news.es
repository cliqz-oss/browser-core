import {
  blurUrlBar,
  checkButtons,
  checkChildren,
  checkParent,
  $cliqzResults,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsNews';

export default function () {
  context('for news rich header', function () {
    before(function () {
      window.preventRestarts = true;
      blurUrlBar();
      respondWith({ results });
      withHistory([]);
      fillIn('bild');
      return waitForPopup(1);
    });

    after(function () {
      window.preventRestarts = false;
    });

    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.news' });
    checkButtons({ $result: $cliqzResults, results });
  });
}
