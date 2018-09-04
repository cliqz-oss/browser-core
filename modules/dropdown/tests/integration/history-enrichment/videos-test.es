import {
  blurUrlBar,
  $cliqzResults,
  expect,
  testsEnabled,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';

import results from '../../../core/integration/fixtures/resultsYoutube';

export default function () {
  if (!testsEnabled()) { return; }

  context('history enrichment for videos', function () {
    let $historyElement;
    const query = 'youtube';
    const url = results[0].url;

    before(async function () {
      blurUrlBar();
      withHistory([{ value: url }]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup(2);
      $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
    });

    it('renders SC videos and buttons only in history', async function () {
      await waitFor(() => {
        expect($historyElement()).to.exist;
        expect($historyElement().querySelectorAll('.videos .result')).to.have.length(3);
        expect($historyElement().querySelectorAll('.buttons .result.btn')).to.have.length(4);
        return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      }, 600);
    });
  });
}
