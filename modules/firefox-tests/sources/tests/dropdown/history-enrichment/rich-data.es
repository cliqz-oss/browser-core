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

import results from '../fixtures/resultsBigMachineRichData';

export default function () {
  context('for rich data', function () {
    let $historyElement;
    const query = 'github';
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

    it('renders deep links and images in history', function () {
      expect($historyElement.querySelector('.images')).to.exist;
      expect($historyElement.querySelectorAll('.images .result')).to.have.length(3);
      expect($historyElement.querySelector('.anchors')).to.exist;
      expect($historyElement.querySelectorAll('.anchors .result')).to.have.length(4);
    });

    it('result was not rendered as backend result', function () {
      expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
        .to.have.length(1);
    });
  });
}
