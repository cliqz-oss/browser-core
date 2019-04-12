import {
  $cliqzResults,
  blurUrlBar,
  checkButtons,
  checkLocationButtons,
  checkMainResult,
  checkMap,
  checkParent,
  fillIn,
  mockSearch,
  prefs,
  waitFor,
  waitForPopup,
  waitForPrefChange,
  win,
  withHistory,
} from './helpers';
import config from '../../../core/config';
import { resultsWithLocal, resultsWithoutLocal } from '../../core/integration/fixtures/resultsLocal';
import inject from '../../../core/kord/inject';

export default function () {
  describe('local results', function () {
    const query = 'rewe';

    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('with "Always ask" settings', function () {
      before(async function () {
        await blurUrlBar();
        const prefValue = prefs.get('share_location');
        if (prefValue !== 'ask') {
          const prefChange = waitForPrefChange('share_location');
          prefs.set('share_location', 'ask');
          await prefChange;
        }

        withHistory([]);
        await mockSearch({ results: resultsWithoutLocal });
        fillIn(query);
        await waitFor(async () => {
          await waitForPopup(1);
          const $res = await $cliqzResults.querySelector(`.result[data-url="${resultsWithoutLocal[0].url}"]`);
          return $res;
        });
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
        await blurUrlBar();
        const prefValue = prefs.get('share_location');
        if (prefValue !== 'no') {
          const prefChange = waitForPrefChange('share_location');
          prefs.set('share_location', 'no');
          await prefChange;
        }

        withHistory([]);
        await mockSearch({ results: resultsWithoutLocal });
        fillIn(query);
        await waitFor(async () => {
          await waitForPopup(1);
          const $res = await $cliqzResults.querySelector(`.result[data-url="${resultsWithoutLocal[0].url}"]`);
          return $res;
        });
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
        await blurUrlBar();
        const prefValue = prefs.get('share_location');
        if (prefValue !== 'yes') {
          const prefChange = waitForPrefChange('share_location');
          prefs.set('share_location', 'yes');
          await prefChange;
        }

        await inject.service('geolocation', ['updateGeoLocation']).updateGeoLocation();

        withHistory([]);
        await mockSearch({ results: resultsWithLocal });
        fillIn(query);
        await waitFor(async () => {
          await waitForPopup(1);
          const $res = await $cliqzResults.querySelector(`.result[data-url="${resultsWithLocal[0].url}"]`);
          return $res;
        });
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
