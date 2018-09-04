import {
  blurUrlBar,
  $cliqzResults,
  fillIn,
  mockSearch,
  press,
  release,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import expectSelection from './common';
import { bmWithButtons } from '../../../core/integration/fixtures/resultsBigMachineWithButtons';
import { urlStripProtocol } from '../../../../core/content/url';

export default function () {
  if (!testsEnabled()) { return; }

  context('keyboard navigation bm results with buttons', function () {
    let $result1Element;
    let $result2Element;
    let $button1Element;
    let $button2Element;
    let $button3Element;
    let $button4Element;
    const results = bmWithButtons;
    const query = 'google';
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;
    const button1Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const button2Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;
    const button3Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[2].url}"]`;
    const button4Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[3].url}"]`;

    beforeEach(async function () {
      blurUrlBar();
      withHistory([]);
      await mockSearch({ results });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector(result1Selector) &&
        $cliqzResults.querySelector(result2Selector) &&
        $cliqzResults.querySelectorAll('.result.btn').length === 4);
      $result1Element = $cliqzResults.querySelector(result1Selector);
      $result2Element = $cliqzResults.querySelector(result2Selector);
      $button1Element = $cliqzResults.querySelector(button1Selector);
      $button2Element = $cliqzResults.querySelector(button2Selector);
      $button3Element = $cliqzResults.querySelector(button3Selector);
      $button4Element = $cliqzResults.querySelector(button4Selector);
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          $button1Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[0].url),
        ), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          $button2Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[1].url),
        ), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          $button3Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[2].url),
        ), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          $button4Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[3].url),
        ), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(
          $result2Element,
          results[1].snippet.friendlyUrl,
        ), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          $result2Element,
          urlStripProtocol(results[1].snippet.friendlyUrl),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          $button4Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[3].url),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          $button3Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[2].url),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          $button2Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[1].url),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          $button1Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[0].url),
        ), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(
          $result1Element,
          results[0].snippet.friendlyUrl,
        ), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          $button1Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[0].url),
        ), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          $button2Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[1].url),
        ), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          $button3Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[2].url),
        ), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          $button4Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[3].url),
        ), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(
          $result2Element,
          results[1].snippet.friendlyUrl,
        ), 600);
      });
    });

    context('navigate with Shift+Tab', function () {
      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          $result2Element,
          results[1].snippet.friendlyUrl,
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          $button4Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[3].url),
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          $button3Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[2].url),
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          $button2Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[1].url),
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          $button1Element,
          urlStripProtocol(results[0].snippet.deepResults[0].links[0].url),
        ), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(
          $result1Element,
          results[0].snippet.friendlyUrl,
        ), 600);
      });
    });
  });
}
