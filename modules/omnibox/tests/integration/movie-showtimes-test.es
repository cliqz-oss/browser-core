import {
  $cliqzResults,
  blurUrlBar,
  checkLocationButtons,
  checkMainResult,
  checkTableOfCinemas,
  dropdownClick,
  fillIn,
  mockSearch,
  patchGeolocation,
  prefs,
  respondWithSnippet,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import { localResults, notLocalResults } from '../../core/integration/fixtures/resultsMovieShowtimes';
import config from '../../../core/config';

export default function () {
  describe('for a movie showtimes SC', function () {
    const query = 'tomb raider';
    patchGeolocation({ latitude: 48.15, longitude: 11.62 });

    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('(UI)', function () {
      context('with "always ask" share location settings', function () {
        before(async function () {
          await blurUrlBar();
          prefs.set('share_location', 'ask');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(1);
        });

        after(async function () {
          await blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: true });
        checkTableOfCinemas({
          $result: $cliqzResults,
          results: notLocalResults,
          isExpanded: false,
          activeTabIdx: 0
        });
      });

      context('with "never" share location settings', function () {
        before(async function () {
          await blurUrlBar();
          prefs.set('share_location', 'no');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(1);
        });

        after(async function () {
          await blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkTableOfCinemas({
          $result: $cliqzResults,
          results: notLocalResults,
          isExpanded: false,
          activeTabIdx: 0
        });
      });

      context('with "always" share location settings', function () {
        before(async function () {
          await blurUrlBar();
          prefs.set('share_location', 'yes');
          await mockSearch({ results: localResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(1);
        });

        after(async function () {
          await blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkTableOfCinemas({
          $result: $cliqzResults,
          results: localResults,
          isExpanded: false,
          activeTabIdx: 0
        });
      });
    });

    context('(interactions)', function () {
      describe('clicking on the "Show more" button', function () {
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(1);
          await dropdownClick('.expand-btn');
          await waitFor(async () => {
            const $timeRows = await $cliqzResults.querySelectorAll('.show-time-row');
            return $timeRows.length > 2;
          });
        });

        after(async function () {
          await blurUrlBar();
        });

        checkMainResult({ $result: $cliqzResults });
        checkTableOfCinemas({
          $result: $cliqzResults,
          results: notLocalResults,
          isExpanded: true,
          activeTabIdx: 0
        });
      });

      describe('clicking on the next day tab', function () {
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(1);
          await dropdownClick('#tab-1');
          await waitFor(async () => {
            const $tab0 = await $cliqzResults.querySelector('#tab-0');
            return !$tab0.classList.contains('checked');
          });
        });

        after(async function () {
          await blurUrlBar();
        });

        checkMainResult({ $result: $cliqzResults });
        checkTableOfCinemas({
          $result: $cliqzResults,
          results: notLocalResults,
          isExpanded: false,
          activeTabIdx: 1
        });
      });

      xdescribe('clicking on the "Show once" location button', function () {
        const allowOnceBtnSelector = '.location-allow-once';

        before(async function () {
          await blurUrlBar();
          prefs.set('share_location', 'ask');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);

          respondWithSnippet({ results: localResults });
          $cliqzResults.querySelector(allowOnceBtnSelector).click();
          await waitFor(() => !$cliqzResults.querySelector(allowOnceBtnSelector));
        });

        after(async function () {
          await blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult($cliqzResults);
        checkLocationButtons($cliqzResults, false);
        checkTableOfCinemas($cliqzResults, localResults, false, 0);
      });

      xdescribe('clicking on the "Always show" location button', function () {
        const alwaysShowBtnSelector = '.location-always-show';

        before(async function () {
          await blurUrlBar();
          prefs.set('share_location', 'ask');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);

          respondWithSnippet({ results: localResults });
          $cliqzResults.querySelector(alwaysShowBtnSelector).click();
          await waitFor(() => !$cliqzResults.querySelector(alwaysShowBtnSelector));
        });

        after(async function () {
          await blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkTableOfCinemas({
          $result: $cliqzResults,
          result: localResults,
          isExpanded: false,
          activeTabIdx: 0
        });
      });
    });
  });
}
