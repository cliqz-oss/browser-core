import {
  blurUrlBar,
  checkButtons,
  checkLocationButtons,
  checkMainResult,
  checkMap,
  checkParent,
  $cliqzResults,
  fillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import config from '../../../core/config';
import { resultsWithLocal, resultsWithoutLocal } from './fixtures/resultsLocal';
import prefs from '../../../core/prefs';

export default function () {
  if (!testsEnabled()) { return; }

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
        prefs.set('share_location', 'ask');
        withHistory([]);
        await mockSearch({ results: resultsWithoutLocal });
        fillIn(query);
        await waitForPopup(1);
        await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${resultsWithoutLocal[0].url}"]`));
      });

      after(function () {
        prefs.set('share_location', config.settings.geolocation || 'ask');
      });

      checkMainResult({ $result: $cliqzResults, isPresent: true });
      checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: true, scType: 'local' });
      checkParent({ $result: $cliqzResults, results: resultsWithoutLocal });
    });

    context('with "Never" settings', function () {
      before(async function () {
        blurUrlBar();
        prefs.set('share_location', 'no');
        withHistory([]);
        await mockSearch({ results: resultsWithoutLocal });
        fillIn(query);
        await waitForPopup(1);
        await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${resultsWithoutLocal[0].url}"]`));
      });

      after(function () {
        prefs.set('share_location', config.settings.geolocation || 'ask');
      });

      checkMainResult({ $result: $cliqzResults, isPresent: true });
      checkLocationButtons({ $result: $cliqzResults, areButtonsPresent: false });
      checkParent({ $result: $cliqzResults, results: resultsWithoutLocal });
      checkButtons({ $result: $cliqzResults, results: resultsWithoutLocal });
    });

    context('with "Always" settings', function () {
      before(async function () {
        blurUrlBar();
        prefs.set('share_location', 'yes');
        withHistory([]);
        await mockSearch({ results: resultsWithLocal });
        fillIn(query);
        await waitForPopup(1);
        await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${resultsWithLocal[0].url}"]`));
      });

      after(function () {
        prefs.set('share_location', config.settings.geolocation || 'ask');
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
