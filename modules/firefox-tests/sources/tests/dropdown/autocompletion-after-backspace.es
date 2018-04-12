import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  press,
  respondWith,
  urlbar,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';

export default function () {
  describe('autocompletion after pressing backspace', function () {
    const query = 'facebook';
    const url = 'https://facebook.com';
    const friendlyUrl = 'facebook.com';
    context('first type query', function () {
      let $resultElement;

      before(async function () {
        blurUrlBar();
        withHistory([]);
        respondWith({ results: [{ url }] });
        fillIn(query);
        await waitForPopup();
        await waitFor(() => urlbar.textValue !== query);
      });

      it('query was autocompleted to the friendly url', function () {
        expect(urlbar.textValue).to.equal(friendlyUrl);
        expect(urlbar.selectionStart).to.equal(query.length);
        expect(urlbar.selectionEnd).to.equal(friendlyUrl.length);
      });

      context('then press "backspace" two times', function () {
        before(function () {
          press({ key: 'Backspace' });
          press({ key: 'Backspace' });
          return waitFor(function () {
            $resultElement = $cliqzResults()[0];
            return urlbar.textValue !== friendlyUrl
              && $resultElement.querySelector('.result.search') !== null;
          });
        });

        it('"search with" result appeared', function () {
          expect($resultElement.querySelector('.result.search')).to.exist;
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
