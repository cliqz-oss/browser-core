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

import results from '../fixtures/resultsLotto6Aus49';

export default function () {
  context('for lotto', function () {
    let $historyElement;
    const query = 'lotto 6 aus 49';
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

    it('renders history result', function () {
      expect($historyElement.querySelector(`.result[data-url="${url}"]`)).to.exist;
    });

    it('renders lotto info and buttons in history', function () {
      expect($historyElement.querySelector('.lotto')).to.exist;
      expect($historyElement.querySelector('.buttons .btn')).to.exist;
      expect($historyElement.querySelectorAll('.buttons .btn')).to.have.length(3);
    });

    it('result was not rendered as backend result', function () {
      expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
        .to.have.length(1);
    });
  });
}
