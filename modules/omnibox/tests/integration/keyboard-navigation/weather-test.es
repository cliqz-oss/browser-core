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
import { weatherResults } from '../../../core/integration/fixtures/resultsWeather';

export default function () {
  context('keyboard navigation weather', function () {
    const query = 'weather munich';
    const searchWithSelector = 'a.result.search';
    const weatherSelector = '.weather';
    const btnSelector = 'a.result.btn';
    const genericSelector = `a.result[data-url="${weatherResults[1].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      withHistory([]);
      await mockSearch({ results: weatherResults });
      fillIn(query);
      await waitForPopup();
      await waitFor(async () => {
        const $searchWithElement = await $cliqzResults.querySelector(searchWithSelector);
        const $resultElement = await $cliqzResults.querySelector(btnSelector);
        const $weatherElement = await $cliqzResults.querySelector(weatherSelector);
        return $searchWithElement && $resultElement && $weatherElement;
      });
    });

    context('navigate with arrowDown', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(btnSelector,
          visibleValue(weatherResults[0].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(genericSelector,
          visibleValue(weatherResults[1].url)), 600);
        press({ key: 'ArrowDown' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with arrowUp', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(genericSelector,
          visibleValue(weatherResults[1].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(btnSelector,
          visibleValue(weatherResults[0].url)), 600);
        press({ key: 'ArrowUp' });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });

    context('navigate with Tab', function () {
      it('selected element and urlbar value are correct', async function () {
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(btnSelector,
          visibleValue(weatherResults[0].url)), 600);
        press({ key: 'Tab' });
        await waitFor(() => expectSelection(genericSelector,
          visibleValue(weatherResults[1].url)), 600);
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
        await waitFor(() => expectSelection(genericSelector,
          visibleValue(weatherResults[1].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(btnSelector,
          visibleValue(weatherResults[0].url)), 600);
        press({ key: 'Tab', shiftKey: true });
        await waitFor(() => expectSelection(searchWithSelector,
          query), 600);
      });
    });
  });
}
