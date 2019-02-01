import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  prefs,
  press,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import { explicitAndSimpleResults } from '../../../core/integration/fixtures/resultsAdultQuestion';

export default function () {
  context('keyboard navigation adult question', function () {
    const results = explicitAndSimpleResults;
    const query = 'po ';
    const searchWithSelector = '.result.search';
    const questionSelector = '.result.adult-question';
    const showOnceSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"allowOnce"}\']';
    const alwaysSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"block"}\']';
    const neverSelector = '.btn[data-url=\'cliqz-actions,{"type":"adult","actionName":"allow"}\']';
    const adult1Selector = `a.result[data-url="${results[0].url}"]`;
    const adult2Selector = `a.result[data-url="${results[1].url}"]`;
    const resultSelector = `a.result[data-url="${results[2].url}"]`;

    beforeEach(async function () {
      await blurUrlBar();
      prefs.set('adultContentFilter', 'moderate');
      withHistory([]);
      await mockSearch({ results: explicitAndSimpleResults });
      fillIn(query);
      await waitForPopup();
      await waitFor(() => $cliqzResults.querySelector('.buttons'));
    });

    afterEach(function () {
      prefs.set('adultContentFilter', 'moderate');
    });

    it('renders question with buttons and normal result', async function () {
      expect(await $cliqzResults.querySelector(searchWithSelector)).to.exist;
      expect(await $cliqzResults.querySelector(questionSelector)).to.exist;
      expect(await $cliqzResults.querySelector(resultSelector)).to.exist;
      expect(await $cliqzResults.querySelector(showOnceSelector)).to.exist;
      expect(await $cliqzResults.querySelector(alwaysSelector)).to.exist;
      expect(await $cliqzResults.querySelector(neverSelector)).to.exist;
      expect(await $cliqzResults.querySelector(adult1Selector)).to.not.exist;
      expect(await $cliqzResults.querySelector(adult2Selector)).to.not.exist;
    });

    context('navigate to "Show once" button', function () {
      beforeEach(async function () {
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $showOnceButton = await $cliqzResults.querySelector(showOnceSelector);
          return $showOnceButton.classList.contains('selected');
        });
      });

      it('press "Enter" -> two adult and normal results were rendered', async function () {
        press({ key: 'Enter' });
        await waitFor(async () => {
          expect(await $cliqzResults.querySelector(adult1Selector)).to.exist;
          expect(await $cliqzResults.querySelector(adult2Selector)).to.exist;
          return expect(await $cliqzResults.querySelector(resultSelector)).to.exist;
        }, 500);
      });
    });

    context('navigate to "Always" button', function () {
      beforeEach(async function () {
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $showOnceButton = await $cliqzResults.querySelector(showOnceSelector);
          return $showOnceButton.classList.contains('selected');
        });
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $alwaysButton = await $cliqzResults.querySelector(alwaysSelector);
          return $alwaysButton.classList.contains('selected');
        });
      });

      it('press "Enter" -> only normal result was rendered', async function () {
        press({ key: 'Enter' });
        await waitFor(async () => {
          expect(await $cliqzResults.querySelector(adult1Selector)).to.not.exist;
          expect(await $cliqzResults.querySelector(adult2Selector)).to.not.exist;
          return expect(await $cliqzResults.querySelector(resultSelector)).to.exist;
        }, 500);
      });
    });

    context('navigate to "Never" button', function () {
      beforeEach(async function () {
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $showOnceButton = await $cliqzResults.querySelector(showOnceSelector);
          return $showOnceButton.classList.contains('selected');
        });
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $alwaysButton = await $cliqzResults.querySelector(alwaysSelector);
          return $alwaysButton.classList.contains('selected');
        });
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $neverButton = await $cliqzResults.querySelector(neverSelector);
          return $neverButton.classList.contains('selected');
        });
      });

      it('press "Enter" -> two adult and normal results were rendered', async function () {
        press({ key: 'Enter' });
        await waitFor(async () => {
          expect(await $cliqzResults.querySelector(adult1Selector)).to.exist;
          expect(await $cliqzResults.querySelector(adult2Selector)).to.exist;
          return expect(await $cliqzResults.querySelector(resultSelector)).to.exist;
        }, 500);
      });
    });
  });
}
