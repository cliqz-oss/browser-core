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

import results from '../../../core/integration/fixtures/resultsBigMachineRichData';

export default function () {
  if (!testsEnabled()) { return; }

  context('history enrichment for rich data', function () {
    let $historyElement;
    const query = 'github';
    const url = results[0].url;

    before(async function () {
      blurUrlBar();
      withHistory([{ value: url }]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup(3);
      $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
    });

    it('renders SC news and buttons only in history', async function () {
      await waitFor(() => {
        expect($historyElement()).to.exist;
        expect($historyElement().querySelectorAll('.images .result')).to.have.length(3);
        expect($historyElement().querySelectorAll('.anchors .result')).to.have.length(4);
        return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      }, 600);
    });
  });
}
