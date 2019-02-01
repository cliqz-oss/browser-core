import {
  blurUrlBar,
  $cliqzResults,
  fillIn,
  mockSearch,
  press,
  release,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import {
  expectSelection,
  visibleValue,
} from './common';
import { bmWithRichData } from '../../../core/integration/fixtures/resultsBigMachineRichData';

export default function () {
  context('keyboard navigation bm results with rich data', function () {
    const results = bmWithRichData;
    const query = 'github';
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
        const $links = await $cliqzResults.querySelectorAll('.anchors .result');
        return $links.length === 4
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
          visibleValue(results[0].friendlyUrl)), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(results[0].friendlyUrl)), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(result2Selector,
          visibleValue(results[1].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(result1Selector,
          visibleValue(results[0].friendlyUrl)), 600);
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
          visibleValue(results[0].friendlyUrl)), 600);
      });
    });
  });
}
