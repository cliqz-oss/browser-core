import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  press,
  release,
  testsEnabled,
  urlbar,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import expectSelection from './common';
import { results } from '../../../core/integration/fixtures/resultsTwoSimpleWithoutAutocomplete';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation two results without autocomplete', function () {
    let $searchWithElement;
    let $result1Element;
    let $result2Element;
    const query = 'qws';
    const searchWithSelector = 'a.result.search';
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(searchWithSelector)
        && $cliqzResults.querySelector(result1Selector)
        && $cliqzResults.querySelector(result2Selector));
      $searchWithElement = $cliqzResults.querySelector(searchWithSelector);
      $result1Element = $cliqzResults.querySelector(result1Selector);
      $result2Element = $cliqzResults.querySelector(result2Selector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($result2Element, results[1].url), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($result2Element, results[1].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($result2Element, results[1].url), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($result2Element, results[1].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection($searchWithElement, query), 600);
      });
    });

    context('first press arrowLeft', function () {
      beforeEach(function () {
        press({ key: 'ArrowLeft' });
        return waitFor(() => expect(urlbar.selectionStart).to.equal(query.length - 1));
      });

      it('query is in the url bar, cursor is at the right place', function () {
        expect(urlbar.mInputField.value).to.equal(query);
        expect(urlbar.selectionStart).to.equal(query.length - 1);
        expect(urlbar.selectionEnd).to.equal(query.length - 1);
      });

      it('then press arrowDown selects next result', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
      });
    });

    context('first press arrowRight', function () {
      beforeEach(function () {
        press({ key: 'ArrowRight' });
      });

      it('query is in the url bar, cursor is at the right place', function () {
        expect(urlbar.mInputField.value).to.equal(query);
        expect(urlbar.selectionStart).to.equal(query.length);
        expect(urlbar.selectionEnd).to.equal(query.length);
      });

      it('on arrowDown selects next result', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection($result1Element, results[0].url), 600);
      });
    });
  });
}
