import {
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  press,
  urlbar,
  waitFor,
  withHistory,
} from '../helpers';

export default function () {
  describe('keyboard tests for backspace', function () {
    const query = 'fa';
    const url1 = 'https://facebook.com';
    const friendlyUrl1 = 'facebook.com';
    const url2 = 'https://faz.com';
    const friendlyUrl2 = 'faz.com';
    const url3 = 'https://not-autocompleted.com';
    const url4 = 'https://faz.com/test';

    context('push two history autocompleted results, navigate to second, press backspace', function () {
      before(async function () {
        await blurUrlBar();
        withHistory([{ value: url1 }, { value: url2 }]);
        await mockSearch({ results: [] });
        fillIn(query);
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === friendlyUrl1;
        });
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === friendlyUrl2;
        });
        withHistory([{ value: url2 }, { value: url4 }]);
        await mockSearch({ results: [] });
        press({ key: 'Backspace' });
      });

      it('query is in the url bar', function () {
        return waitFor(
          async () => expect(await urlbar.textValue).to.equal(query),
          1000,
        );
      });
    });

    context('push two history not autocompleted results, navigate to second, press backspace', function () {
      before(async function () {
        await blurUrlBar();
        withHistory([{ value: url1 }, { value: url3 }]);
        await mockSearch({ results: [] });
        fillIn(query);
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === friendlyUrl1;
        });
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === url3;
        });
        withHistory([{ value: url3 }, { value: url4 }]);
        await mockSearch({ results: [] });
        press({ key: 'Backspace' });
      });

      it('press backspace -> url without last symbol is in the url bar', function () {
        return waitFor(
          async () => expect(await urlbar.textValue).to.equal(url3.slice(0, -1)),
          1000,
        );
      });
    });

    context('push two backend autocompleted results, navigate to second, press backspace', function () {
      before(async function () {
        await blurUrlBar();
        withHistory([]);
        await mockSearch({ results: [{ url: url1 }, { url: url2 }] });
        fillIn(query);
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === friendlyUrl1;
        });
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === friendlyUrl2;
        });
        withHistory([]);
        await mockSearch({ results: [{ url: url2 }, { url: url4 }] });
        press({ key: 'Backspace' });
      });

      it('query is in the url bar', function () {
        return waitFor(
          async () => expect(await urlbar.textValue).to.equal(query),
          1000,
        );
      });
    });

    context('push two backend not autocompleted results, navigate to second, press backspace', function () {
      before(async function () {
        await blurUrlBar();
        withHistory([]);
        await mockSearch({ results: [{ url: url1 }, { url: url3 }] });
        fillIn(query);
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === friendlyUrl1;
        });
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === url3;
        });
        withHistory([]);
        await mockSearch({ results: [{ url: url3 }, { url: url4 }] });
        press({ key: 'Backspace' });
      });

      it('press backspace -> url without last symbol is in the url bar', function () {
        return waitFor(
          async () => expect(await urlbar.textValue).to.equal(url3.slice(0, url3.length - 1)),
          1000,
        );
      });
    });
  });
}
