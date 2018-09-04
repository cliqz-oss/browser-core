import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  respondWith,
  testsEnabled,
  urlbar,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from '../helpers';

export default function () {
  if (!testsEnabled()) { return; }

  describe('autocompletion for backend & history results', function () {
    const query = 'fa';
    const historyUrl = 'https://facebook.com';
    const historyFriendlyUrl = 'facebook.com';
    const backendUrl = 'https://faz.com';
    const historyUrl1 = 'https://fatesthistory.com';
    const historyFriendlyUrl1 = 'fatesthistory.com';
    const backendUrl1 = 'https://fatestbackend.com';

    context('history comes first', function () {
      before(async function () {
        blurUrlBar();
        withHistory([{ value: historyUrl }]);
        respondWith({ results: [{ url: backendUrl }] }, 600);
        fillIn(query);
        await waitForPopup();
        await Promise.all([
          waitFor(() => urlbar.textValue === historyFriendlyUrl),
          waitFor(() => $cliqzResults.querySelector(`.result[data-url="${backendUrl}"]`)),
        ]);
      });

      it('after backend comes history autocompletion stays', function () {
        expect(urlbar.textValue).to.equal(historyFriendlyUrl);
        expect(urlbar.selectionStart).to.equal(query.length);
        expect(urlbar.selectionEnd).to.equal(historyFriendlyUrl.length);
      });
    });

    context('backend comes first', function () {
      before(async function () {
        win.preventRestarts = true;
        blurUrlBar();
        withHistory([{ value: historyUrl1 }], 600);
        respondWith({ results: [{ url: backendUrl1 }] });
        fillIn(query);
        await waitForPopup();
        /* need to be sure that there is no "search with" result, which means
        the query was autocompleted */
        await waitFor(() => !$cliqzResults.querySelector('.result.search') &&
          urlbar.textValue !== query);
      });

      after(function () {
        win.preventRestarts = false;
      });

      // then check that both results were rendered at the same time
      it('history and backend results were rendered', function () {
        expect($cliqzResults.querySelector('[data-url="https://fatesthistory.com"]')).to.exist;
        expect($cliqzResults.querySelector('[data-url="https://fatestbackend.com"]')).to.exist;
      });

      it('query was autocompleted to history url', async function () {
        expect(urlbar.textValue).to.equal(historyFriendlyUrl1);
        expect(urlbar.selectionStart).to.equal(query.length);
        expect(urlbar.selectionEnd).to.equal(historyFriendlyUrl1.length);
      });
    });
  });
}
