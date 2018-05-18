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

import results from '../fixtures/resultsYoutube';

export default function () {
  context('for videos', function () {
    let $historyElement;
    const query = 'youtube';
    const url = results[0].url;

    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      withHistory([{ value: url }]);
      respondWith({ results });
      fillIn(query);
      await waitForPopup(2);
      $historyElement = await waitFor(
        () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history')
      );
    });

    after(function () {
      window.preventRestarts = false;
    });

    it('renders history result', function () {
      expect($historyElement.querySelector(`.result[data-url="${url}"]`)).to.exist;
    });

    it('renders videos and buttons in history', function () {
      expect($historyElement.querySelector('.videos')).to.exist;
      expect($historyElement.querySelectorAll('.videos .result')).to.have.length(3);
      expect($historyElement.querySelector('.buttons')).to.exist;
      expect($historyElement.querySelectorAll('.buttons .result.btn')).to.have.length(4);
    });

    it('result was not rendered as backend result', function () {
      expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
        .to.have.length(1);
    });
  });
}
