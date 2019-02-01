import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  press,
  urlbar,
  waitFor,
  win,
  withHistory,
} from '../helpers';

export default function () {
  describe('autocompletion after pressing backspace', function () {
    const query = 'fac';
    const url1 = 'https://facebook.com';
    const url2 = 'https://faz.com';

    const friendlyUrl = 'facebook.com';
    context('first type query', function () {
      before(async function () {
        win.preventRestarts = true;
        await blurUrlBar();
        withHistory([]);
        await mockSearch({ results: [{ url: url1 }] });
        fillIn(query);
        await waitFor(async () => {
          const newQuery = await urlbar.textValue;
          return newQuery !== query && newQuery.startsWith(query);
        });
      });

      after(function () {
        win.preventRestarts = false;
      });

      it('query was autocompleted to the friendly url', async function () {
        expect(await urlbar.textValue).to.equal(friendlyUrl);
        expect(await urlbar.selectionStart).to.equal(query.length);
        expect(await urlbar.selectionEnd).to.equal(friendlyUrl.length);
      });

      context('then press "backspace" two times', function () {
        before(async function () {
          withHistory([]);
          await mockSearch({ results: [{ url: url1 }, { url: url2 }] });
          press({ key: 'Backspace' });
          press({ key: 'Backspace' });
          await waitFor(async () => await $cliqzResults.querySelector(`.result[href="${url2}"]`) !== null);
        });

        it('"search with" result appeared', async function () {
          const searchWithResult = await $cliqzResults.querySelector('.result.search');
          expect(searchWithResult).to.exist;
          expect(searchWithResult.textContent.trim())
            .to.contain(query.substring(0, query.length - 1));
        });

        it('there is query in the url bar', async function () {
          expect(await urlbar.textValue).to.equal(query.substring(0, query.length - 1));
          expect(await urlbar.selectionStart).to.equal(query.length - 1);
          expect(await urlbar.selectionEnd).to.equal(query.length - 1);
        });
      });
    });
  });
}
