/* global window */

import {
  blurUrlBar,
  checkLocationButtons,
  checkMainResult,
  checkMap,
  checkParent,
  checkTableOfShowings,
  $cliqzResults,
  fillIn,
  mockSearch,
  patchGeolocation,
  respondWithSnippet,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import { notLocalResults, localResults } from './fixtures/resultsCinema';
import config from '../../../core/config';
import prefs from '../../../core/prefs';

export default function () {
  if (!testsEnabled()) { return; }

  describe('for cinema SC', function () {
    const query = 'yorck.de';
    patchGeolocation({ latitude: 48.15, longitude: 11.62 });

    before(function () {
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('(UI)', function () {
      context('with "always ask" share location settings', function () {
        before(async function () {
          blurUrlBar();
          prefs.set('share_location', 'ask');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);
        });

        after(function () {
          blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results: notLocalResults });
        checkMap({ $result: $cliqzResults, results: notLocalResults, isDistanceShown: false });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: true });
        checkTableOfShowings({
          $result: $cliqzResults,
          results: notLocalResults,
          isExpanded: false,
          activeTabIdx: 0 });
      });

      context('with "never" share location settings', function () {
        before(async function () {
          blurUrlBar();
          prefs.set('share_location', 'no');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);
        });

        after(function () {
          blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results: notLocalResults });
        checkMap({ $result: $cliqzResults, results: notLocalResults, isDistanceShown: false });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkTableOfShowings({
          $result: $cliqzResults,
          results: notLocalResults,
          isExpanded: false,
          activeTabIdx: 0
        });
      });

      context('with "always" share location settings', function () {
        before(async function () {
          blurUrlBar();
          prefs.set('share_location', 'yes');
          await mockSearch({ results: localResults });
          withHistory([]);
          fillIn('cinemaxx');
          await waitForPopup(1);
          await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${localResults[0].url}"]`));
        });

        after(function () {
          blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results: localResults });
        checkMap({ $result: $cliqzResults, results: localResults, isDistanceShown: true });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkTableOfShowings({
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
          blurUrlBar();
          prefs.set('share_location', 'no');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);
          $cliqzResults.querySelector('.expand-btn').click();
          await waitFor(function () {
            return $cliqzResults.querySelectorAll('.show-time-row').length > 2;
          });
        });

        after(function () {
          blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results: notLocalResults });
        checkMap({ $result: $cliqzResults, results: notLocalResults, isDistanceShown: false });
        checkTableOfShowings({
          $result: $cliqzResults,
          results: notLocalResults,
          isExpanded: true,
          activeTabIdx: 0
        });
      });

      describe('clicking on the next day tab', function () {
        const showtimeTabsSelector = '.dropdown-tab';

        before(async function () {
          blurUrlBar();
          prefs.set('share_location', 'no');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);
          $cliqzResults.querySelectorAll(showtimeTabsSelector)[1].click();
          await waitFor(function () {
            return $cliqzResults
              .querySelectorAll(showtimeTabsSelector)[1].classList.contains('checked');
          });
        });

        after(function () {
          blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results: notLocalResults });
        checkMap({ $result: $cliqzResults, results: notLocalResults, isDistanceShown: false });
        checkTableOfShowings({
          $result: $cliqzResults,
          results: notLocalResults,
          isExpanded: false,
          activeTabIdx: 1
        });
      });

      xdescribe('clicking on the "Show once" location button', function () {
        const allowOnceBtnSelector = '.location-allow-once';

        before(async function () {
          this.timeout(10000);
          blurUrlBar();
          prefs.set('share_location', 'ask');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);

          respondWithSnippet({ results: localResults });
          $cliqzResults.querySelector(allowOnceBtnSelector).click();
          await waitFor(() => !$cliqzResults.querySelector(allowOnceBtnSelector));
        });

        after(function () {
          blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkParent({ $result: $cliqzResults, results: localResults });
        checkMap({ $result: $cliqzResults, results: localResults, isDistanceShown: true });
        checkTableOfShowings({
          $result: $cliqzResults,
          results: localResults,
          isExpanded: false,
          activeTabIdx: 0
        });
      });

      xdescribe('clicking on the "Always show" location button', function () {
        const alwaysShowBtnSelector = '.location-always-show';

        before(async function () {
          this.timeout(10000);
          blurUrlBar();
          prefs.set('share_location', 'ask');
          await mockSearch({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);

          respondWithSnippet({ results: localResults });
          $cliqzResults.querySelector(alwaysShowBtnSelector).click();
          await waitFor(() => !$cliqzResults.querySelector(alwaysShowBtnSelector));
        });

        after(function () {
          blurUrlBar();
          prefs.set('share_location', config.settings.geolocation || 'ask');
        });

        checkMainResult({ $result: $cliqzResults });
        checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkParent({ $result: $cliqzResults, results: localResults });
        checkMap({ $result: $cliqzResults, results: localResults, isDistanceShown: true });
        checkTableOfShowings({
          $result: $cliqzResults,
          results: localResults,
          isExpanded: false,
          activeTabIdx: 0
        });
      });
    });
  });
}
