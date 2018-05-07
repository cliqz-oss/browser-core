/* global window */

import {
  blurUrlBar,
  checkLocationButtons,
  checkMainResult,
  checkMap,
  checkParent,
  checkTableOfShowings,
  CliqzUtils,
  $cliqzResults,
  fillIn,
  patchGeolocation,
  respondWith,
  respondWithSnippet,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import { notLocalResults, localResults } from './fixtures/resultsCinema';
import config from '../../../core/config';

export default function () {
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
          CliqzUtils.setPref('share_location', 'ask');
          respondWith({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);
        });

        after(function () {
          blurUrlBar();
          CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
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
          CliqzUtils.setPref('share_location', 'no');
          respondWith({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);
        });

        after(function () {
          blurUrlBar();
          CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
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
          CliqzUtils.setPref('share_location', 'yes');
          respondWith({ results: localResults });
          withHistory([]);
          fillIn('cinemaxx');
          await waitForPopup(1);
        });

        after(function () {
          blurUrlBar();
          CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
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
          CliqzUtils.setPref('share_location', 'no');
          respondWith({ results: notLocalResults });
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
          CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
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
          CliqzUtils.setPref('share_location', 'no');
          respondWith({ results: notLocalResults });
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
          CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
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
          CliqzUtils.setPref('share_location', 'ask');
          respondWith({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);

          respondWithSnippet({ results: localResults });
          $cliqzResults.querySelector(allowOnceBtnSelector).click();
          await waitFor(() => !$cliqzResults.querySelector(allowOnceBtnSelector));
        });

        after(function () {
          blurUrlBar();
          CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
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
          CliqzUtils.setPref('share_location', 'ask');
          respondWith({ results: notLocalResults });
          withHistory([]);
          fillIn(query);
          await waitForPopup(2);

          respondWithSnippet({ results: localResults });
          $cliqzResults.querySelector(alwaysShowBtnSelector).click();
          await waitFor(() => !$cliqzResults.querySelector(alwaysShowBtnSelector));
        });

        after(function () {
          blurUrlBar();
          CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
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
