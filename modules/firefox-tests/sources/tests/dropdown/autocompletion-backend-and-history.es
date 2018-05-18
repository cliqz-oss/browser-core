import {
  blurUrlBar,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  respondWith,
  waitFor,
  withHistory } from './helpers';

export default function () {
  describe('autocompletion for backend & history results', function () {
    const query = 'fa';
    const historyUrl = 'https://facebook.com';
    const historyFriendlyUrl = 'facebook.com';
    const backendUrl = 'https://faz.com';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;

    context('history comes first', function () {
      beforeEach(async function () {
        blurUrlBar();
        withHistory([{ value: historyUrl }]);
        respondWith({ results: [{ url: backendUrl }] }, 600);
        fillIn(query);
        await waitFor(function () {
          return urlBar.textValue === historyFriendlyUrl;
        });
      });


      it('after backend comes history autocompletion  stays', async function () {
        await waitFor(function () {
          return $cliqzResults.querySelector(`.result[href="${backendUrl}"]`) !== null;
        });
        expect(urlBar.textValue).to.equal(historyFriendlyUrl);
        expect(urlBar.selectionStart).to.equal(query.length);
        expect(urlBar.selectionEnd).to.equal(historyFriendlyUrl.length);
      });
    });

    context('backend comes first', function () {
      beforeEach(async function () {
        blurUrlBar();
        withHistory([{ value: historyUrl }], 500);
        respondWith({ results: [{ url: backendUrl }] });
        fillIn(query);
        await waitFor(function () {
          return urlBar.textValue === historyFriendlyUrl;
        });
      });

      it('after history comes autocompletion changes', async function () {
        await waitFor(function () {
          return $cliqzResults.querySelector(`.result[href="${historyUrl}"]`) !== null;
        });
        expect(urlBar.textValue).to.equal(historyFriendlyUrl);
        expect(urlBar.selectionStart).to.equal(query.length);
        expect(urlBar.selectionEnd).to.equal(historyFriendlyUrl.length);
      });
    });
  });
}
