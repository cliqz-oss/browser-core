import {
  $cliqzResults,
  app,
  blurUrlBar,
  checkAdultButtons,
  checkMainResult,
  checkParent,
  checkSearchResult,
  expect,
  fillIn,
  getLocalisedString,
  mockSearch,
  prefs,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsAdultQuestion';

export default function () {
  const query = 'xvideos';
  const mainResultSelector = '.cliqz-result:not(.history)';
  const questionSelector = '.result.adult-question .padded';


  describe('adult question', function () {
    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('(UI)', function () {
      context('when set to "Always ask"', function () {
        before(async function () {
          await blurUrlBar();
          prefs.set('adultContentFilter', 'moderate');
          await mockSearch({ results });
          withHistory([]);
          fillIn(query);
          await waitForPopup();
          await waitFor(async () => {
            const $buttons = await $cliqzResults.querySelectorAll('.buttons .result');
            return $buttons.length === 3;
          });
        });

        after(function () {
          prefs.set('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: true });

        it('renders question', async function () {
          const $question = await $cliqzResults
            .querySelector(`${mainResultSelector} ${questionSelector}`);
          const questionText = getLocalisedString('adult_info');

          expect($question).to.exist;
          expect($question).to.contain.text(questionText);
        });
      });

      context('when set to "Never block"', function () {
        before(async function () {
          await blurUrlBar();
          prefs.set('adultContentFilter', 'liberal');
          await mockSearch({ results });
          withHistory([]);
          fillIn(query);
          await waitForPopup(1);
          await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${results[0].url}"]`));
        });

        after(function () {
          prefs.set('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: false });
      });

      context('when set to "Always block"', function () {
        before(async function () {
          await blurUrlBar();
          app.modules.search.action('setDefaultSearchEngine', 'Google');
          prefs.set('adultContentFilter', 'conservative');
          await mockSearch({ results });
          withHistory([]);
          fillIn(`${query} `);
          await waitForPopup();
        });

        after(function () {
          prefs.set('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults, isPresent: false });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkSearchResult({ $result: $cliqzResults, query, urlText: 'Search with Google' });
      });
    });

    xcontext('(integration)', function () {
      describe('clicking on "Show Once" button', function () {
        before(async function () {
          await blurUrlBar();
          prefs.set('adultContentFilter', 'moderate');
          await mockSearch({ results });
          withHistory([]);
          fillIn(query);
          await waitFor(() => $cliqzResults.querySelectorAll('.buttons .result')[0]);
          $cliqzResults.querySelectorAll('.buttons .result')[0].click();
          await waitFor(() => !$cliqzResults.querySelector('.btn'));
        });

        after(function () {
          prefs.set('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: false });
      });

      describe('clicking on "Always" button', function () {
        before(async function () {
          await blurUrlBar();
          app.modules.search.action('setDefaultSearchEngine', 'Google');
          prefs.set('adultContentFilter', 'moderate');
          await mockSearch({ results });
          withHistory([]);
          fillIn(`${query} `);
          await waitFor(() => $cliqzResults.querySelectorAll('.buttons .result').length === 3);
          $cliqzResults.querySelectorAll('.buttons .result')[1].click();
          await waitFor(() => $cliqzResults.querySelectorAll('.result').length === 1);
        });

        after(function () {
          prefs.set('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults, isPresent: false });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkSearchResult({ $result: $cliqzResults, query, urlText: 'Search with Google' });
      });

      describe('clicking on "Never" button', function () {
        before(async function () {
          await blurUrlBar();
          prefs.set('adultContentFilter', 'moderate');
          await mockSearch({ results });
          fillIn(query);
          await waitFor(() => $cliqzResults.querySelectorAll('.buttons .result')[0]);
          $cliqzResults.querySelectorAll('.buttons .result')[2].click();
          await waitFor(() => !$cliqzResults.querySelector('.btn'));
        });

        after(function () {
          prefs.set('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults, isPresent: true });
        checkParent({ $result: $cliqzResults, results });
      });
    });
  });
}
