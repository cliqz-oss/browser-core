import {
  blurUrlBar,
  checkButtons,
  checkChildren,
  checkMainResult,
  checkParent,
  $cliqzResults,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsYoutube';

export default function () {
  context('for youtube rich header', function () {
    before(function () {
      window.preventRestarts = true;
      blurUrlBar();
      respondWith({ results });
      withHistory([]);
      fillIn('youtube');
      return waitForPopup(1);
    });

    after(function () {
      window.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });
    checkChildren({ $result: $cliqzResults, results, parentSelector: '.videos', youtube: true });
    checkButtons({ $result: $cliqzResults, results });
  });
}
