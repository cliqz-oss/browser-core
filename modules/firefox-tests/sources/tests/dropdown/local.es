import {
  blurUrlBar,
  checkButtons,
  checkLocationButtons,
  checkMainResult,
  checkMap,
  checkParent,
  $cliqzResults,
  CliqzUtils,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import config from '../../../core/config';
import { resultsWithLocal, resultsWithoutLocal } from './fixtures/resultsLocal';

export default function () {
  describe('local results', function () {
    const query = 'rewe';

    before(function () {
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('with "Always ask" settings', function () {
      before(async function () {
        blurUrlBar();
        CliqzUtils.setPref('share_location', 'ask');
        withHistory([]);
        respondWith({ results: resultsWithoutLocal });
        fillIn(query);
        await waitForPopup(1);
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      checkMainResult({ $result: $cliqzResults, isPresent: true });
      checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: true, scType: 'local' });
      checkParent({ $result: $cliqzResults, results: resultsWithoutLocal });
    });

    context('with "Never" settings', function () {
      before(async function () {
        blurUrlBar();
        CliqzUtils.setPref('share_location', 'no');
        withHistory([]);
        respondWith({ results: resultsWithoutLocal });
        fillIn(query);
        await waitForPopup(1);
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      checkMainResult({ $result: $cliqzResults, isPresent: true });
      checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
      checkParent({ $result: $cliqzResults, results: resultsWithoutLocal });
      checkButtons({ $result: $cliqzResults, results: resultsWithoutLocal });
    });

    context('with "Always" settings', function () {
      before(async function () {
        blurUrlBar();
        CliqzUtils.setPref('share_location', 'yes');
        withHistory([]);
        respondWith({ results: resultsWithLocal });
        fillIn(query);
        await waitForPopup(1);
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      checkMainResult({ $result: $cliqzResults, isPresent: true });
      checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
      checkParent({ $result: $cliqzResults, results: resultsWithLocal });
      checkButtons({ $result: $cliqzResults, results: resultsWithLocal });
      checkMap({
        $result: $cliqzResults,
        results: resultsWithLocal,
        isDistanceShown: true,
        scType: 'local'
      });
    });
  });
}
