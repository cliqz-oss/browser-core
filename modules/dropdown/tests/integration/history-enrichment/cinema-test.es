import {
  blurUrlBar,
  $cliqzResults,
  expect,
  testsEnabled,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  withHistory
} from '../helpers';

import { notLocalResults } from '../fixtures/resultsCinema';

export default function () {
  if (!testsEnabled()) { return; }

  context('history enrichment for cinema', function () {
    let $historyElement;
    const query = 'yorck';
    const results = notLocalResults;
    const url = results[0].url;

    before(async function () {
      blurUrlBar();
      withHistory([{ value: url }]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup(2);
      $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
    });

    it('renders SC cinema only in history', async function () {
      await waitFor(() => {
        expect($historyElement()).to.exist;
        expect($historyElement().querySelector('.movie-cinema')).to.exist;
        return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      }, 600);
    });
  });
}
