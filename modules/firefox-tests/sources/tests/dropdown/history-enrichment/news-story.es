import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory
} from '../helpers';

import results from '../fixtures/resultsNewsStoryOfTheDay';

export default function () {
  context('for news story', function () {
    let $historyElement;
    const query = 'trump';
    const url = results[0].url;

    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      withHistory([{ value: url }]);
      respondWith({ results });
      fillIn(query);
      await waitForPopup(3);
      $historyElement = await waitFor(
        () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history')
      );
    });

    after(function () {
      window.preventRestarts = false;
    });

    it('renders news story result in history', function () {
      expect($historyElement.querySelector(`.news-story .result[data-url="${url}"]`)).to.exist;
    });

    it('result was not rendered as backend result', function () {
      expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
        .to.have.length(1);
    });
  });
}
