import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from '../helpers';

export default function () {
  if (!testsEnabled()) { return; }

  describe('deduplication for history cluster', function () {
    context('sent two clustered histories and one backend', function () {
      const historyUrl1 = 'https://test.com/history/one';
      const historyUrl2 = 'https://test.com/history/two';
      const backendUrl = 'https://test.com/';
      const query = 'test ';

      before(async function () {
        win.preventRestarts = true;
        blurUrlBar();
        withHistory([
          { value: historyUrl1 },
          { value: historyUrl2 }
        ]);
        await mockSearch({ results: [{ url: backendUrl }] });
        fillIn(query);
        await waitForPopup();
        await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${backendUrl}"]`));
      });

      after(function () {
        win.preventRestarts = false;
      });

      it('history was clustered', async function () {
        const $historyCluster = () =>
          $cliqzResults.querySelector(`.result[data-url="${backendUrl}"]`).closest('.history');
        await waitFor(() => {
          expect($historyCluster().querySelector(`.result[data-url="${backendUrl}"]`)).to.exist;
          expect($historyCluster().querySelector(`.history-cluster[data-url="${historyUrl1}"]`)).to.exist;
          return expect($historyCluster().querySelector(`.history-cluster[data-url="${historyUrl2}"]`)).to.exist;
        }, 1000);
      });

      it('backend result was deduplicated', async function () {
        expect($cliqzResults.querySelectorAll(`.result[data-url="${backendUrl}"]`))
          .to.have.length(1);
      });
    });
  });
}
