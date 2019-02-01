import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';

import results from '../../../core/integration/fixtures/resultsLotto6Aus49';

export default function () {
  context('history enrichment for lotto', function () {
    let $historyElement;
    const query = 'lotto 6 aus 49';
    const url = results[0].url;

    before(async function () {
      await blurUrlBar();
      withHistory([{ value: url }]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup(2);
      $historyElement = async () => {
        const $result = await $cliqzResults.querySelector(`.result[data-url="${url}"]`);
        return $result.closest('.history');
      };
    });

    it('renders SC lotto and buttons only in history', async function () {
      await waitFor(async () => {
        const $history = await $historyElement();
        expect($history).to.exist;
        expect($history.querySelector('.lotto')).to.exist;
        expect($history.querySelectorAll('.buttons .btn')).to.have.length(3);
        return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      }, 600);
    });
  });
}
