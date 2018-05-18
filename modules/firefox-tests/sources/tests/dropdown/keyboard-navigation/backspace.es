import {
  blurUrlBar,
  expect,
  fillIn,
  press,
  respondWith,
  urlbar,
  waitFor,
  withHistory } from '../helpers';

export default function () {
  describe('keyboard tests for backspace', function () {
    const query = 'fa';
    const url1 = 'https://facebook.com';
    const friendlyUrl1 = 'facebook.com';
    const url2 = 'https://faz.com';
    const url3 = 'https://faz.com/test';

    context('push two history results, navigate to second', function () {
      before(async function () {
        blurUrlBar();
        withHistory([{ value: url1 }, { value: url2 }]);
        respondWith({ results: [] });
        fillIn(query);
        await waitFor(() => urlbar.mInputField.value === friendlyUrl1);
        press({ key: 'ArrowDown' });
        await waitFor(() => urlbar.mInputField.value === url2);
      });

      it('press backspace -> url without last symbol is in the url bar', function () {
        withHistory([{ value: url2 }, { value: url3 }]);
        respondWith({ results: [] });
        press({ key: 'Backspace' });
        return waitFor(
          () => expect(urlbar.mInputField.value).to.equal(url2.slice(0, url2.length - 1)),
          1000,
        );
      });
    });

    context('push two backend results, navigate to second', function () {
      before(async function () {
        blurUrlBar();
        withHistory([]);
        respondWith({ results: [{ url: url1 }, { url: url2 }] });
        fillIn(query);
        await waitFor(() => urlbar.mInputField.value === friendlyUrl1);
        press({ key: 'ArrowDown' });
        await waitFor(() => urlbar.mInputField.value === url2);
      });

      it('press backspace -> url without last symbol is in the url bar', function () {
        withHistory([]);
        respondWith({ results: [{ url: url2 }, { url: url3 }] });
        press({ key: 'Backspace' });
        return waitFor(
          () => expect(urlbar.textValue).to.equal(url2.slice(0, url2.length - 1)),
          1000,
        );
      });
    });
  });
}
