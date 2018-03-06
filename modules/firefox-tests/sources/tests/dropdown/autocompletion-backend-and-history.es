import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';

export default function () {
  describe('autocompletion for backend & history results', function () {
    const query = 'fa';
    const historyUrl = 'https://facebook.com';
    const historyFriendlyUrl = 'facebook.com';
    const backendUrl = 'https://faz.com';
    const backendFriendlyUrl = 'faz.com';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    context('history comes first', function () {
      let $resultElement;
      beforeEach(function () {
        withHistory([{ value: historyUrl }]);
        respondWith({ results: [{ url: backendUrl }] }, 600);
        fillIn(query);
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          return waitFor(function () {
            return urlBar.textValue === historyFriendlyUrl;
          });
        });
      });

      it('after backend comes history autocompletion stays', function () {
        return waitFor(function () {
          return $resultElement.querySelector(`.result[href="${backendUrl}"]`) !== null;
        }).then(function () {
          expect(urlBar.textValue).to.equal(historyFriendlyUrl);
          expect(urlBar.selectionStart).to.equal(query.length);
          expect(urlBar.selectionEnd).to.equal(historyFriendlyUrl.length);
        });
      });
    });

    context('backend comes first', function () {
      let $resultElement;
      beforeEach(function () {
        withHistory([{ value: historyUrl }], 200);
        respondWith({ results: [{ url: backendUrl }] });
        fillIn(query);
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          return waitFor(function () {
            return $resultElement.querySelector(`.result[href="${backendUrl}"]`) !== null;
          });
        });
      });

      it('after history comes autocompletion appears', function () {
        return waitFor(function () {
          return $resultElement.querySelector(`.result[href="${historyUrl}"]`) !== null;
        }).then(function () {
          expect(urlBar.textValue).to.equal(historyFriendlyUrl);
          expect(urlBar.selectionStart).to.equal(query.length);
          expect(urlBar.selectionEnd).to.equal(historyFriendlyUrl.length);
        });
      });
    });

    context('backend comes first', function () {
      let $resultElement;
      beforeEach(function () {
        withHistory([{ value: historyUrl }], 1000);
        respondWith({ results: [{ url: backendUrl }] });
        fillIn(query);
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          return waitFor(function () {
            return $resultElement.querySelector(`.result[href="${backendUrl}"]`) !== null
              && urlBar.textValue !== query;
          });
        });
      });

      it('history doesn\'t come: backend autocompletion appears', function () {
        expect(urlBar.textValue).to.equal(backendFriendlyUrl);
        expect(urlBar.selectionStart).to.equal(query.length);
        expect(urlBar.selectionEnd).to.equal(backendFriendlyUrl.length);
      });
    });
  });
}
