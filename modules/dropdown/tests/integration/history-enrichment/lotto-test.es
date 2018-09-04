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

import results from '../../../core/integration/fixtures/resultsLotto6Aus49';

export default function () {
  if (!testsEnabled()) { return; }

  context('history enrichment for lotto', function () {
    let $historyElement;
    const query = 'lotto 6 aus 49';
    const url = results[0].url;

    before(async function () {
      blurUrlBar();
      withHistory([{ value: url }]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup(3);
      $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
    });

    it('renders SC lotto and buttons only in history', async function () {
      await waitFor(() => {
        expect($historyElement()).to.exist;
        expect($historyElement().querySelector('.lotto')).to.exist;
        expect($historyElement().querySelectorAll('.buttons .btn')).to.have.length(3);
        return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      }, 600);
    });
  });
}
