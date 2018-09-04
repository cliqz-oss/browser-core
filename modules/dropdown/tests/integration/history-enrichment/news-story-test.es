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

import results from '../../../core/integration/fixtures/resultsNewsStoryOfTheDay';

export default function () {
  if (!testsEnabled()) { return; }

  context('history enrichment for news story', function () {
    let $historyElement;
    const query = 'trump';
    const url = results[0].url;

    before(async function () {
      blurUrlBar();
      withHistory([{ value: url }]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup(3);
      $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
    });

    it('renders SC news story only in history', async function () {
      await waitFor(() => {
        expect($historyElement()).to.exist;
        expect($historyElement().querySelector(`.news-story .result[data-url="${url}"]`)).to.exist;
        return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      }, 600);
    });
  });
}
