/* eslint no-restricted-syntax: 'off' */

/*
 * This module implements a mechanism which enables/disables AB tests
 *
 */
import telemetry from '../core/services/telemetry';
import prefs from '../core/prefs';
import console from '../core/console';
import config from '../core/config';
import pacemaker from '../core/services/pacemaker';
import { getDefaultEngine, revertToOriginalEngine } from '../core/search-engines';
import { httpGet } from '../core/http';
import { isDesktopBrowser } from '../core/platform';

const ONE_HOUR = 60 * 60 * 1000;

function log(msg) {
  console.log('abtests-legacy', msg);
}

const CliqzABTests = {
  PREF: 'ABTests',
  PREF_OVERRIDE: 'ABTestsOverride',
  URL: `${config.settings.STATISTICS}/abtests/check?session=`,
  // Accessors to list of tests this user is current in
  getCurrent() {
    if (prefs.has(CliqzABTests.PREF)) {
      return JSON.parse(prefs.get(CliqzABTests.PREF));
    }
    return undefined;
  },
  setCurrent(tests) {
    prefs.set(CliqzABTests.PREF, JSON.stringify(tests));
  },

  // Accessors to list of tests in override list
  getOverride() {
    if (prefs.has(CliqzABTests.PREF_OVERRIDE)) {
      const ABtests = JSON.parse(prefs.get(CliqzABTests.PREF_OVERRIDE));
      return ABtests;
    }
    return undefined;
  },
  setOverride(tests) {
    if (tests) {
      prefs.set(CliqzABTests.PREF_OVERRIDE, JSON.stringify(tests));
    } else {
      prefs.clear(CliqzABTests.PREF_OVERRIDE);
    }
  },

  start() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // set a new timer to be triggered after 1 hour
    this.timer = pacemaker.setTimeout(async () => {
      try {
        await CliqzABTests.check();
      } catch (e) {
        console.error('abtests-legacy update failed', e);
      } finally {
        this.start();
      }
    }, ONE_HOUR);
  },

  stop() {
    pacemaker.clearTimeout(this.timer);
    this.timer = null;
  },

  // Check for newest list of AB tests from server
  async check() {
    if (config.settings.channel === '99') {
      return Promise.resolve();
    }

    log('AB checking');
    // clear the last timer

    const response = await CliqzABTests.retrieve();
    try {
      let prevABtests = {};
      if (prefs.has(CliqzABTests.PREF)) {
        prevABtests = JSON.parse(prefs.get(CliqzABTests.PREF));
      }
      let respABtests = JSON.parse(response.responseText);

      // Override the backend response - for local testing
      const overrideABtests = CliqzABTests.getOverride();
      if (overrideABtests) {
        respABtests = overrideABtests;
      }

      const newABtests = {};

      let changes = false; // any changes?

      // find old AB tests to leave
      for (const o in prevABtests) {
        if (!respABtests[o]) {
          if (CliqzABTests.leave(o)) {
            changes = true;
          }
        } else {
          // keep this old test in the list of current tests
          newABtests[o] = prevABtests[o];
        }
      }

      // find new AB tests to enter
      for (const n in respABtests) {
        if (!(prevABtests[n])) {
          if (CliqzABTests.enter(n, respABtests[n])) {
            changes = true;
            newABtests[n] = respABtests[n];
          }
        }
      }

      if (changes) {
        prefs.set(CliqzABTests.PREF, JSON.stringify(newABtests));
      }
    } catch (e) {
      log(`retrieve error: ${e.message}`);
    }
    return this.getCurrent();
  },
  retrieve() {
    const url = CliqzABTests.URL + encodeURIComponent(prefs.get('session', ''));
    const onerror = () => { log('failed to retrieve AB test data'); };
    return new Promise(resolve => httpGet(url, resolve, onerror, 15000));
  },
  enter(abtest) {
    // Add new AB tests here.
    // It is safe to remove them as soon as the test is over.
    let ruleExecuted = true;
    switch (abtest) {
      case '1028_A':
        prefs.set('humanWeb', false);
        break;
      case '1028_B':
        prefs.set('humanWeb', true);
        break;
      case '1032_A':
        prefs.set('spellCorrMessage', false);
        break;
      case '1032_B':
        prefs.set('spellCorrMessage', true);
        break;
      case '1036_B':
        prefs.set('extended_onboarding_same_result', true);
        break;
      case '1045_A':
        break;
      case '1045_B':
        prefs.set('antiTrackTest', true);
        break;
      case '1048_B':
        prefs.set('attrackAlterPostdataTracking', true);
        break;
      case '1049_B':
        prefs.set('attrackCanvasFingerprintTracking', true);
        break;
      case '1050_B':
        prefs.set('attrackRefererTracking', true);
        break;
      case '1051_B':
        prefs.set('antiTrackTest', true);
        break;
      case '1057_A':
        prefs.set('trackerTxt', false);
        break;
      case '1057_B':
        prefs.set('trackerTxt', true);
        break;
      case '1059_A':
        prefs.set('attrack.local_tracking', false);
        break;
      case '1059_B':
        prefs.set('attrack.local_tracking', true);
        break;
      case '1060_A':
        prefs.set('attrackBloomFilter', false);
        break;
      case '1060_B':
        prefs.set('attrackBloomFilter', true);
        break;
      case '1061_A':
        prefs.set('attrackUI', false);
        break;
      case '1061_B':
        prefs.set('attrackUI', true);
        break;
      case '1063_A':
        prefs.set('double-enter2', false);
        break;
      case '1063_B':
        prefs.set('double-enter2', true);
        break;
      case '1064_A':
        prefs.set('attrackDefaultAction', 'same');
        break;
      case '1064_B':
        prefs.set('attrackDefaultAction', 'placeholder');
        break;
      case '1064_C':
        prefs.set('attrackDefaultAction', 'block');
        break;
      case '1064_D':
        prefs.set('attrackDefaultAction', 'empty');
        break;
      case '1064_E':
        prefs.set('attrackDefaultAction', 'replace');
        break;
      case '1065_A':
        prefs.set('freshTabNewsEmail', false);
        break;
      case '1065_B':
        prefs.set('freshTabNewsEmail', true);
        break;
      case '1066_A':
        prefs.set('proxyNetwork', false);
        break;
      case '1066_B':
        prefs.set('proxyNetwork', true);
        break;
      case '1070_A':
        prefs.set('cliqz-anti-phishing', false);
        prefs.set('cliqz-anti-phishing-enabled', false);
        break;
      case '1070_B':
        prefs.set('cliqz-anti-phishing', true);
        prefs.set('cliqz-anti-phishing-enabled', true);
        break;
      case '1071_A':
        prefs.set('browser.privatebrowsing.apt', false, '');
        break;
      case '1071_B':
        prefs.set('browser.privatebrowsing.apt', true, '');
        break;
      case '1074_A':
        prefs.set('cliqz-adb-abtest', false);
        break;
      case '1074_B':
        prefs.set('cliqz-adb-abtest', true);
        break;
      case '1078_A':
        prefs.set('modules.anolysis.enabled', false);
        break;
      case '1078_B':
        prefs.set('modules.anolysis.enabled', true);
        break;
      case '1080_A':
        prefs.set('freshtabNewBrand', false);
        break;
      case '1080_B':
        prefs.set('freshtabNewBrand', true);
        break;
      case '1081_A':
        prefs.set('attrackLogBreakage', false);
        break;
      case '1081_B':
        prefs.set('attrackLogBreakage', true);
        break;
      case '1084_B':
        prefs.set('attrackOverrideUserAgent', true);
        break;
      case '1085_A':
        prefs.set('extOnboardShareLocation', false);
        break;
      case '1085_B':
        prefs.set('extOnboardShareLocation', true);
        break;
      case '1086_A':
        prefs.set('checkLogos', '1');
        break;
      case '1086_B':
        prefs.set('checkLogos', '0');
        break;
      case '1087_A':
        prefs.set('modules.context-search.enabled', false);
        break;
      case '1087_B':
        prefs.set('modules.context-search.enabled', true);
        break;
      case '1092_A':
        prefs.set('extOnboardVideoDownloader', false);
        break;
      case '1092_B':
        prefs.set('extOnboardVideoDownloader', true);
        break;
      case '1094_A':
        prefs.set('ff-experiment', false);
        break;
      case '1094_B':
        prefs.set('ff-experiment', true);
        break;
      case '1096_A':
        prefs.set('extOnboardCliqzConnect', false);
        break;
      case '1096_B':
        prefs.set('extOnboardCliqzConnect', true);
        break;
      case '1097_A':
        prefs.set('dropdownAdCampaignPosition', 'top');
        break;
      case '1097_B':
        prefs.set('dropdownAdCampaignPosition', 'bottom');
        break;
      case '1098_A': // ADB turned OFF
        if (prefs.get('cliqz-adb-onboarding-ab', false) === true) {
          // turn ADB back OFF only if it was set ON by this test
          prefs.clear('cliqz-adb-onboarding-ab');
          prefs.clear('cliqz-adb-onboarding-message');
          prefs.set('cliqz-adb', 0);
        }
        break;
      case '1098_B': // ADB turned ON
        if (prefs.get('cliqz-adb', 0) === 1) {
          // ADB already turned ON by the user so leave this test
          CliqzABTests.disable('1098_B');
        } else {
          prefs.set('cliqz-adb-onboarding-ab', true);
          prefs.set('cliqz-adb', 1);
        }
        break;
      case '1098_C': // ADB turned ON + message
        if (prefs.get('cliqz-adb', 0) === 1) {
          // ADB already turned ON by the user so leave this test
          CliqzABTests.disable('1098_C');
        } else {
          prefs.set('cliqz-adb-onboarding-ab', true);
          prefs.set('cliqz-adb', 1);
          prefs.set('cliqz-adb-onboarding-message', true);
        }
        break;
      case '1099_A':
        prefs.set('attrackCookieTrustReferers', false);
        break;
      case '1099_B':
        prefs.set('attrackCookieTrustReferers', true);
        break;
      case '1101_A':
        prefs.set('modules.history.enabled', false);
        break;
      case '1101_B':
        prefs.set('modules.history.enabled', true);
        break;
      case '1102_A':
        prefs.set('modules.antitracking-blocker.enabled', false);
        break;
      case '1102_B':
        prefs.set('antitrackingBlocklist', 'default');
        prefs.set('modules.antitracking-blocker.enabled', true);
        break;
      case '1102_C':
        prefs.set('antitrackingBlocklist', 'cliqz');
        prefs.set('modules.antitracking-blocker.enabled', true);
        break;
      case '1102_D':
        prefs.set('antitrackingBlocklist', 'ghostery');
        prefs.set('modules.antitracking-blocker.enabled', true);
        break;
      case '1103_A':
        prefs.set('offersDropdownAdPosition', 'top');
        break;
      case '1103_B':
        prefs.set('offersDropdownAdPosition', 'bottom');
        break;
      case '1103_C':
        prefs.set('offersDropdownAdPosition', 'right');
        break;
      case '1106_A':
        prefs.set('greenads', 'green');
        break;
      case '1106_B':
        prefs.set('greenads', 'collect');
        break;
      case '1106_C':
        prefs.set('greenads', 'disabled');
        break;
      case '1107_A':
        prefs.set('MarketAnalysisEnabled', false);
        break;
      case '1107_B':
        prefs.set('MarketAnalysisEnabled', true);
        break;
      case '1108_A':
        prefs.set('extOnboardNewSearchUI', false);
        break;
      case '1108_B':
        prefs.set('extOnboardNewSearchUI', true);
        break;
      case '1111_A':
        prefs.set('modules.history-analyzer.enabled', false);
        break;
      case '1111_B':
        prefs.set('modules.history-analyzer.enabled', true);
        break;
      case '1112_A':
        prefs.set('experiment_svm', false);
        break;
      case '1112_B':
        prefs.set('experiment_svm', true);
        break;
      case '1114_A':
      case '1114_B':
      case '1114_C':
      case '1114_D':
      case '1114_E':
      case '1114_F':
      case '1114_G':
      case '1114_H':
      case '1114_I':
      case '1114_J':
      case '1114_K':
        // we activate this test locally in services.es/session()
        // so we only need to disable it with the AB test
        if (getDefaultEngine().name === 'Cliqz') {
          revertToOriginalEngine();
        }
        prefs.clear('serp_test');
        break;
      case '1115_A':
        if (isDesktopBrowser) {
          prefs.set('network.http.referer.XOriginTrimmingPolicy', 0);
        }
        break;
      case '1115_B':
        if (isDesktopBrowser) {
          prefs.set('network.http.referer.XOriginTrimmingPolicy', 1);
        }
        break;
      case '1116_A':
        break;
      case '1116_B':
        break;
      case '1117_A':
        prefs.set('cookie-monster.expireSession', false);
        break;
      case '1117_B':
        prefs.set('cookie-monster.expireSession', true);
        break;
      case '1118_A':
        prefs.set('cookie-monster.nonTracker', false);
        break;
      case '1118_B':
        prefs.set('cookie-monster.nonTracker', true);
        break;
      case '1119_A':
        prefs.set('friends.enable.level', 'development');
        break;
      case '1119_B':
        prefs.set('friends.enable.level', 'beta');
        break;
      case '1119_C':
        prefs.set('friends.enable.level', 'production');
        break;
      case '1121_A':
        prefs.set('ui.newtab.settings-button-style', 'text', 'host.');
        break;
      case '1121_B':
        prefs.set('ui.newtab.settings-button-style', 'button', 'host.');
        break;
      case '1122_A':
        prefs.set('modules.cookie-monster.enabled', false);
        break;
      case '1122_B':
        // B: cookie monster on for trackers only
        prefs.set('modules.cookie-monster.enabled', true);
        prefs.set('cookie-monster.expireSession', false);
        prefs.set('cookie-monster.nonTracker', false);
        break;
      case '1122_C':
        // C: cookie monster on for trackers and non-trackers
        prefs.set('modules.cookie-monster.enabled', true);
        prefs.set('cookie-monster.expireSession', true);
        prefs.set('cookie-monster.nonTracker', true);
        break;
      case '1122_D':
        // D: cookie monster on for trackers and non-trackers, and anti-tracking only blocking
        // tracker cookies
        prefs.set('modules.cookie-monster.enabled', true);
        prefs.set('cookie-monster.expireSession', true);
        prefs.set('cookie-monster.nonTracker', true);
        prefs.set('attrack.cookieMode', 'trackers');
        break;
      case '1123_A':
        prefs.set('dynamic-offers.enabled', false);
        break;
      case '1123_B':
        prefs.set('dynamic-offers.enabled', true);
        break;
      case '1124_A':
        prefs.set('offers-popup.type', 'card');
        break;
      case '1124_B':
        prefs.set('offers-popup.type', 'lodgev1');
        break;
      case '1124_C':
        prefs.set('offers-popup.type', 'lodgev2');
        break;
      case '1125_B':
        // changes browser cookie setting to enable Firefox blocking cookies and storage for
        // tracker domains in third-party contexts. We do not join the test if user already has a
        // custom cookie behaviour
        if (prefs.get('network.cookie.cookieBehavior', '') !== 0) {
          return false;
        }
        prefs.set('network.cookie.cookieBehavior', 4, '');
        break;
      default:
        ruleExecuted = false;
    }
    if (ruleExecuted) {
      const action = {
        type: 'abtest',
        action: 'enter',
        name: abtest
      };
      telemetry.push(action);

      return true;
    }
    return false;
  },
  leave(abtest, disable) {
    // Restore defaults after an AB test is finished.
    // DO NOT remove test cleanup code too quickly, a user
    // might not start the browser for a long time and
    // get stuck in a test if we remove cases too early.
    let ruleExecuted = true;
    switch (abtest) {
      case '1024_B':
        prefs.clear('categoryAssessment');
        break;
      case '1028_A':
      case '1028_B':
        prefs.clear('humanWeb');
        break;
      case '1032_A':
      case '1032_B':
        prefs.clear('spellCorrMessage');
        break;
      case '1036_A':
      case '1036_B':
        prefs.clear('extended_onboarding_same_result');
        prefs.clear('extended_onboarding');
        break;
      case '1045_A':
      case '1045_B':
        prefs.clear('antiTrackTest');
        break;
      case '1046_A':
      case '1047_A':
      case '1048_A':
      case '1049_A':
      case '1050_A':
        break;
      case '1046_B':
        prefs.clear('attrackBlockCookieTracking');
        break;
      case '1047_B':
        prefs.clear('attrackRemoveQueryStringTracking');
        break;
      case '1048_B':
        prefs.clear('attrackAlterPostdataTracking');
        break;
      case '1049_B':
        prefs.clear('attrackCanvasFingerprintTracking');
        break;
      case '1050_B':
        prefs.clear('attrackRefererTracking');
        break;
      case '1051_B':
        prefs.clear('antiTrackTest');
        break;
      case '1052_A':
      case '1052_B':
        prefs.clear('attrackBlockCookieTracking');
        break;
      case '1053_A':
      case '1053_B':
        prefs.clear('attrackRemoveQueryStringTracking');
        break;
      case '1055_A':
      case '1055_B':
        prefs.clear('unblockEnabled');
        break;
      case '1056_A':
      case '1056_B':
        prefs.clear('freshTabAB');
        break;
      case '1057_B':
        prefs.clear('trackerTxt');
        break;
      case '1058_A':
      case '1058_B':
        prefs.clear('unblockMode');
        break;
      case '1059_A':
      case '1059_B':
        prefs.clear('attrack.local_tracking');
        break;
      case '1060_A':
      case '1060_B':
        prefs.clear('attrackBloomFilter');
        break;
      case '1061_A':
      case '1061_B':
        prefs.clear('attrackUI');
        break;
      case '1063_A':
      case '1063_B':
        prefs.clear('double-enter2');
        break;
      case '1064_A':
      case '1064_B':
      case '1064_C':
      case '1064_D':
      case '1064_E':
        prefs.clear('attrackDefaultAction');
        break;
      case '1066_A':
      case '1066_B':
        prefs.clear('proxyNetwork');
        break;
      case '1065_A':
      case '1065_B':
        prefs.clear('freshTabNewsEmail');
        break;
      case '1068_A':
      case '1068_B':
        prefs.clear('languageDedup');
        break;
      case '1069_A':
      case '1069_B':
        prefs.clear('grOfferSwitchFlag');
        break;
      case '1070_A':
      case '1070_B':
        prefs.clear('cliqz-anti-phishing');
        prefs.clear('cliqz-anti-phishing-enabled');
        break;
      case '1071_A':
      case '1071_B':
        prefs.clear('browser.privatebrowsing.apt', '');
        break;
      case '1072_A':
      case '1072_B':
        prefs.clear('grFeatureEnabled');
        break;
      case '1074_A':
      case '1074_B':
        prefs.clear('cliqz-adb-abtest');
        break;
      case '1075_A':
      case '1075_B':
        prefs.clear('freshtabFeedback');
        break;
      case '1076_A':
      case '1076_B':
        prefs.clear('history.timeouts');
        break;
      case '1077_A':
      case '1077_B':
        prefs.clear('languageDedup');
        break;
      case '1078_A':
      case '1078_B':
        // Anolysis is disabled by default.
        prefs.set('modules.anolysis.enabled', false);
        break;
      case '1079_A':
      case '1079_B':
        prefs.clear('controlCenter');
        break;
      case '1080_A':
      case '1080_B':
        prefs.clear('freshtabNewBrand');
        break;
      case '1081_A':
      case '1081_B':
        prefs.clear('attrackLogBreakage');
        break;
      case '1082_A':
      case '1082_B':
        prefs.clear('experimentalCookieDroppingDetection');
        break;
      case '1084_B':
        prefs.clear('attrackOverrideUserAgent');
        break;
      case '1085_A':
      case '1085_B':
        prefs.clear('extOnboardShareLocation');
        break;
      case '1086_A':
      case '1086_B':
        prefs.clear('checkLogos');
        break;
      case '1087_B':
        prefs.set('modules.context-search.enabled', false);
        break;
      case '1088_A':
      case '1088_B':
        prefs.clear('offers2FeatureEnabled');
        break;
      case '1091_A':
        prefs.clear('dropDownStyle');
        break;
      case '1092_A':
      case '1092_B':
        prefs.clear('extOnboardVideoDownloader');
        break;
      case '1093_A':
      case '1093_B':
        prefs.clear('extOnboardCliqzGhostery');
        break;
      case '1094_A':
      case '1094_B':
        prefs.clear('ff-experiment');
        break;
      case '1095_A':
      case '1095_B':
        prefs.clear('connect');
        break;
      case '1096_A':
      case '1096_B':
        prefs.clear('extOnboardCliqzConnect');
        break;
      case '1097_A':
      case '1097_B':
        prefs.clear('dropdownAdCampaignPosition');
        break;
      case '1098_A':
      case '1098_B':
      case '1098_C':
        if (prefs.get('cliqz-adb-onboarding-ab', false) === true) {
          // turn ADB back OFF only if it was set ON by this test
          prefs.set('cliqz-adb', 0);
        }
        prefs.clear('cliqz-adb-onboarding-ab');
        prefs.clear('cliqz-adb-onboarding-message');
        break;
      case '1099_A':
      case '1099_B':
        prefs.clear('attrackCookieTrustReferers');
        break;
      case '1100_A':
      case '1100_B':
        prefs.clear('offersHubEnableSwitch');
        break;
      case '1101_A':
      case '1101_B':
        prefs.clear('modules.history.enabled');
        break;
      case '1102_A':
      case '1102_B':
      case '1102_C':
      case '1102_D':
        prefs.set('modules.antitracking-blocker.enabled', false);
        prefs.clear('antitrackingBlocklist');
        break;
      case '1103_A':
      case '1103_B':
      case '1103_C':
        prefs.clear('offersDropdownAdPosition');
        break;
      case '1104_A':
      case '1104_B':
      case '1104_C':
        prefs.clear('offersHubTrigger');
        break;
      case '1105_A':
      case '1105_B':
        prefs.clear('offersBrowserPanelEnableSwitch');
        break;
      case '1106_A':
      case '1106_B':
      case '1106_C':
        prefs.clear('greenads');
        break;
      case '1107_A':
      case '1107_B':
        prefs.clear('MarketAnalysisEnabled');
        break;
      case '1108_A':
      case '1108_B':
        prefs.clear('extOnboardNewSearchUI');
        break;
      case '1109_A':
      case '1109_B':
        prefs.clear('offersDropdownSwitch');
        break;
      case '1110_A':
      case '1110_B':
        prefs.clear('cliqzTabOffersNotification');
        break;
      case '1111_A':
      case '1111_B':
        prefs.set('modules.history-analyzer.enabled', false);
        break;
      case '1112_A':
      case '1112_B':
        prefs.clear('experiment_svm');
        break;
      case '1114_A':
      case '1114_B':
      case '1114_C':
      case '1114_D':
      case '1114_E':
      case '1114_F':
      case '1114_G':
      case '1114_H':
      case '1114_I':
      case '1114_J':
      case '1114_K':
        if (getDefaultEngine().name === 'Cliqz') {
          revertToOriginalEngine();
        }
        prefs.clear('serp_test');
        break;
      case '1115_A':
      case '1115_B':
        if (isDesktopBrowser) {
          prefs.clear('network.http.referer.XOriginTrimmingPolicy');
        }
        break;
      case '1117_A':
      case '1117_B':
        prefs.clear('cookie-monster.expireSession');
        break;
      case '1118_A':
      case '1118_B':
        prefs.clear('cookie-monster.nonTracker');
        break;
      case '1119_A':
      case '1119_B':
        prefs.set('friends.enable.level', 'development');
        break;
      case '1119_C':
        prefs.set('friends.enable.level', 'development');
        break;
      case '1120_A':
      case '1120_B':
      case '1120_C':
        prefs.clear('freshtab.post.position');
        break;
      case '1122_A':
      case '1122_B':
      case '1122_C':
      case '1122_D':
        prefs.set('modules.cookie-monster.enabled', false);
        prefs.clear('cookie-monster.expireSession');
        prefs.clear('cookie-monster.nonTracker');
        prefs.clear('attrack.cookieMode');
        break;
      case '1123_A':
      case '1123_B':
        prefs.clear('dynamic-offers.enabled');
        break;
      case '1124_A':
      case '1124_B':
      case '1124_C':
        prefs.clear('offers-popup.type');
        break;
      case '1125_A':
      case '1125_B':
        prefs.set('network.cookie.cookieBehavior', 4, '');
        break;
      default:
        ruleExecuted = false;
    }
    if (ruleExecuted) {
      const action = {
        type: 'abtest',
        action: 'leave',
        name: abtest,
        disable
      };
      telemetry.push(action);
      return true;
    }
    return false;
  },
  disable(abtest) {
    // Disable an AB test but do not remove it from list of active AB tests,
    // this is intended to be used by the extension itself when it experiences
    // an error associated with this AB test.
    if (prefs.has(CliqzABTests.PREF)) {
      const curABtests = JSON.parse(prefs.get(CliqzABTests.PREF));

      if (curABtests[abtest] && CliqzABTests.leave(abtest, true)) {
        // mark as disabled and save back to preferences
        curABtests[abtest].disabled = true;
        prefs.set(CliqzABTests.PREF, JSON.stringify(curABtests));
      }
    }
  },
};

export default CliqzABTests;
