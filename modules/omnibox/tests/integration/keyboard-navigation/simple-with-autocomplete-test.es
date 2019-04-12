import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  press,
  release,
  urlbar,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import {
  expectSelection,
  visibleValue,
} from './common';
import { results, friendlyUrl } from '../../../core/integration/fixtures/resultsTwoSimple';

export default function () {
  context('keyboard navigation two results with autocomplete', function () {
    const query = 'ro';
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $result1Element = await $cliqzResults.querySelector(result1Selector);
        const $result2Element = await $cliqzResults.querySelector(result2Selector);
        const urlbarTextValue = await urlbar.textValue;
        return urlbarTextValue === friendlyUrl[results[0].url]
          && $result1Element
          && $result2Element;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    xcontext('first press arrowLeft', function () {
      beforeEach(function () {
        press({ key: 'ArrowLeft' });
        return waitFor(async () => {
          const start = await urlbar.selectionStart;
          const end = await urlbar.selectionEnd;
          return start === end;
        });
      });

      it('autocompleted friendlyUrl is in url bar', async function () {
        expect(await urlbar.textValue).to.equal(visibleValue(friendlyUrl[results[0].url]));
      });

      it('cursor is at the right place', async function () {
        expect(await urlbar.selectionStart).to.equal(query.length);
        expect(await urlbar.selectionEnd).to.equal(query.length);
      });

      it('then press arrowDown and arrowUp', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          await expectSelection(result2Selector, visibleValue(results[1].url));
        }, 3000);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });

    xcontext('first press arrowRight', function () {
      beforeEach(function () {
        press({ key: 'ArrowRight' });
        return waitFor(async () => {
          const start = await urlbar.selectionStart;
          const end = await urlbar.selectionEnd;
          return start === end;
        });
      });

      it('there is autocompleted link in url bar', async function () {
        expect(await urlbar.textValue).to.equal(visibleValue(friendlyUrl[results[0].url]));
      });

      it('cursor is at the right place', async function () {
        expect(await urlbar.selectionStart).to.equal(friendlyUrl[results[0].url].length);
        expect(await urlbar.selectionEnd).to.equal(friendlyUrl[results[0].url].length);
      });

      it('then press arrowDown and arrowUp', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(friendlyUrl[results[0].url])), 600);
      });
    });
  });
}
