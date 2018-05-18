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

import { notLocalResults } from '../fixtures/resultsCinema';

export default function () {
  context('for cinema', function () {
    let $historyElement;
    const query = 'yorck';
    const results = notLocalResults;
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

    it('renders cinema result in history', function () {
      expect($historyElement.querySelector('.movie-cinema')).to.exist;
    });

    it('result was not rendered as backend result', function () {
      expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
        .to.have.length(1);
    });
  });
}
