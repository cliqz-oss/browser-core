import {
  blurUrlBar,
  expect,
  fastFillIn,
  respondWith,
  sleep,
  testsEnabled,
  urlbar,
  waitFor,
  win,
  withHistory,
} from '../helpers';

export default function () {
  if (!testsEnabled()) { return; }

  describe('autocompletion happens once and then stays', function () {
    const url1 = 'https://facebook.com';
    const url2 = 'https://faz.com';
    const query = 'f';
    const friendlyUrl = 'facebook.com';
    let changes;
    let timeout;

    // this function checks url bar value every 1 ms, and increases counter
    // every time the value was changed
    function checkUrlBarValue(val) {
      let initial = val;
      changes = 0;
      function checkChanged() {
        if (urlbar.mInputField.value !== initial) {
          changes += 1;
          initial = urlbar.mInputField.value;
        }
        timeout = setTimeout(checkChanged, 1);
      }
      checkChanged();
    }

    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('for one history result', function () {
      before(function () {
        blurUrlBar();
        checkUrlBarValue(urlbar.mInputField.value);
        withHistory([{ value: url1 }]);
        respondWith({ results: [] });
        fastFillIn(query);
        return Promise.all([
          waitFor(() => urlbar.mInputField.value === friendlyUrl),
          sleep(1000),
        ]);
      });

      after(function () {
        clearTimeout(timeout);
      });

      it('query was autocompleted only once', function () {
        // once it was changed to query, and then autocompleted
        expect(changes).to.equal(2);
      });
    });

    context('for one backend result', function () {
      before(function () {
        blurUrlBar();
        checkUrlBarValue(urlbar.mInputField.value);
        withHistory([]);
        respondWith({ results: [{ url: url1 }] });
        fastFillIn(query);
        return Promise.all([
          waitFor(() => urlbar.mInputField.value === friendlyUrl),
          sleep(1000),
        ]);
      });

      after(function () {
        clearTimeout(timeout);
      });

      it('query was autocompleted only once', function () {
        // once it was changed to query, and then autocompleted
        expect(changes).to.equal(2);
      });
    });

    context('for history & backend, history pushed first', function () {
      before(function () {
        blurUrlBar();
        checkUrlBarValue(urlbar.mInputField.value);
        withHistory([{ value: url1 }]);
        respondWith({ results: [{ url: url2 }] }, 400);
        fastFillIn(query);
        return Promise.all([
          waitFor(() => urlbar.mInputField.value === friendlyUrl),
          sleep(1000),
        ]);
      });

      after(function () {
        clearTimeout(timeout);
      });

      it('query was autocompleted only once', function () {
        // once it was changed to query, and then autocompleted
        expect(changes).to.equal(2);
      });
    });

    context('for history & backend, backend pushed first', function () {
      before(function () {
        blurUrlBar();
        checkUrlBarValue(urlbar.mInputField.value);
        withHistory([{ value: url1 }], 400);
        respondWith({ results: [{ url: url2 }] });
        fastFillIn(query);
        return Promise.all([
          waitFor(() => urlbar.mInputField.value === friendlyUrl),
          sleep(1000),
        ]);
      });

      after(function () {
        clearTimeout(timeout);
      });

      it('query was autocompleted only once', function () {
        // once it was changed to query, and then autocompleted
        expect(changes).to.equal(2);
      });
    });
  });
}
