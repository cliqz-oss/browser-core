import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  press,
  respondWith,
  urlbar,
  waitFor,
  withHistory } from '../helpers';

export default function () {
  describe('autocompletion after pressing backspace', function () {
    const query = 'fac';
    const url1 = 'https://facebook.com';
    const url2 = 'https://faz.com';

    const friendlyUrl = 'facebook.com';
    context('first type query', function () {
      before(async function () {
        blurUrlBar();
        withHistory([]);
        respondWith({ results: [{ url: url1 }] });
        fillIn(query);
        await waitFor(() => urlbar.textValue !== query);
      });

      it('query was autocompleted to the friendly url', function () {
        expect(urlbar.textValue).to.equal(friendlyUrl);
        expect(urlbar.selectionStart).to.equal(query.length);
        expect(urlbar.selectionEnd).to.equal(friendlyUrl.length);
      });

      context('then press "backspace" two times', function () {
        before(async function () {
          withHistory([]);
          respondWith({ results: [{ url: url1 }, { url: url2 }] });
          press({ key: 'Backspace' });
          press({ key: 'Backspace' });
          await waitFor(() => $cliqzResults.querySelector(`.result[href="${url2}"]`) !== null);
        });

        it('"search with" result appeared', function () {
          const searchWithResult = $cliqzResults.querySelector('.result.search');
          expect(searchWithResult).to.exist;
          expect(searchWithResult.textContent.trim())
            .to.contain(query.substring(0, query.length - 1));
        });

        it('there is query in the url bar', function () {
          expect(urlbar.textValue).to.equal(query.substring(0, query.length - 1));
          expect(urlbar.selectionStart).to.equal(query.length - 1);
          expect(urlbar.selectionEnd).to.equal(query.length - 1);
        });
      });
    });
  });
}
