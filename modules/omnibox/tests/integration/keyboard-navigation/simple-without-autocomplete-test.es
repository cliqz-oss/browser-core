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
import { results } from '../../../core/integration/fixtures/resultsTwoSimpleWithoutAutocomplete';

export default function () {
  context('keyboard navigation two results without autocomplete', function () {
    let $searchWithElement;
    let $result1Element;
    let $result2Element;
    const query = 'qws';
    const searchWithSelector = 'a.result.search';
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
        $result1Element = await $cliqzResults.querySelector(result1Selector);
        $result2Element = await $cliqzResults.querySelector(result2Selector);
        return $searchWithElement && $result1Element && $result2Element;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(results[0].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(results[0].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(results[0].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
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
          visibleValue(results[0].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    xcontext('first press arrowLeft', function () {
      beforeEach(function () {
        press({ key: 'ArrowLeft' });
        return waitFor(() => expect(urlbar.selectionStart).to.equal(query.length - 1));
      });

      it('query is in the url bar, cursor is at the right place', async function () {
        expect(await urlbar.textValue).to.equal(query);
        expect(await urlbar.selectionStart).to.equal(query.length - 1);
        expect(await urlbar.selectionEnd).to.equal(query.length - 1);
      });

      it('then press arrowDown selects next result', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(results[0].url)), 600);
      });
    });

    xcontext('first press arrowRight', function () {
      beforeEach(function () {
        press({ key: 'ArrowRight' });
      });

      it('query is in the url bar, cursor is at the right place', async function () {
        expect(await urlbar.textValue).to.equal(query);
        expect(await urlbar.selectionStart).to.equal(query.length);
        expect(await urlbar.selectionEnd).to.equal(query.length);
      });

      it('on arrowDown selects next result', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(results[0].url)), 600);
      });
    });
  });
}
