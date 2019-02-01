import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  urlbar,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from '../helpers';

export default function () {
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
        await blurUrlBar();
        withHistory([{ value: historyUrl }]);
        await mockSearch({ results: [{ url: backendUrl }] }, 600);
        fillIn(query);
        await waitForPopup();
        await Promise.all([
          waitFor(async () => await urlbar.textValue === historyFriendlyUrl),
          waitFor(async () => {
            const $backendResult = await $cliqzResults.querySelector(`.result[data-url="${backendUrl}"]`);
            return $backendResult;
          }),
        ]);
      });

      it('after backend comes history autocompletion stays', async function () {
        expect(await urlbar.textValue).to.equal(historyFriendlyUrl);
        expect(await urlbar.selectionStart).to.equal(query.length);
        expect(await urlbar.selectionEnd).to.equal(historyFriendlyUrl.length);
      });
    });

    xcontext('backend comes first', function () {
      // TODO: clear dropdown
      before(async function () {
        win.preventRestarts = true;
        await blurUrlBar();
        withHistory([{ value: historyUrl1 }], 600);
        await mockSearch({ results: [{ url: backendUrl1 }] });
        fillIn(query);
        await waitForPopup();
        /* need to be sure that there is no "search with" result, which means
        the query was autocompleted */
        await waitFor(async () => {
          const $searchResult = await $cliqzResults.querySelector('.result.search');
          return !$searchResult && await urlbar.textValue !== query;
        });
      });

      after(function () {
        win.preventRestarts = false;
      });

      // then check that both results were rendered at the same time
      it('history and backend results were rendered', async function () {
        expect(await $cliqzResults.querySelector('[data-url="https://fatesthistory.com"]')).to.exist;
        expect(await $cliqzResults.querySelector('[data-url="https://fatestbackend.com"]')).to.exist;
      });

      it('query was autocompleted to history url', async function () {
        expect(await urlbar.textValue).to.equal(historyFriendlyUrl1);
        expect(await urlbar.selectionStart).to.equal(query.length);
        expect(await urlbar.selectionEnd).to.equal(historyFriendlyUrl1.length);
      });
    });
  });
}
