/* global describe, TESTS, DEPS, getModule */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */

import chai from 'chai';
import chaiDom from 'chai-dom';

import adultQuestionTests from './tests/dropdown/adult-question';
import adultQuestionIntegrationTests from './tests/dropdown/adult-question-integration';
import bigMachineWithButtonsTests from './tests/dropdown/big-machine-with-buttons';
import bigMachineWithRichDataTests from './tests/dropdown/big-machine-rich-data';
import calculatorTests from './tests/dropdown/calculator';
import currencyConverterTests from './tests/dropdown/currency_converter';
import defaultSearchEngineTests from './tests/dropdown/default-search-engine';
import flightsTests from './tests/dropdown/flights-template';
import geoWithLocalTests from './tests/dropdown/geo_yes';
import geoWithoutLocalTests from './tests/dropdown/geo_without_consent';
import historyAndNewsTests from './tests/dropdown/history_and_news';
import historyClusterTests from './tests/dropdown/history-cluster';
import keyboardNavigationCalculatorTests from './tests/dropdown/keyboard-navigation-calculator';
import keyboardNavigationCurrencyConverterTests from './tests/dropdown/keyboard-navigation-currency-converter';
import keyboardNavigationTwoSimpleTests from './tests/dropdown/keyboard-navigation-two-simple';
import keyboardNavigationTwoSimpleWithoutAutocompleteTests from './tests/dropdown/keyboard-navigation-two-simple-without-autocomplete';
import keyboardNavigationUnitConverterTests from './tests/dropdown/keyboard-navigation-unit-converter';
import lotto6Aus49Tests from './tests/dropdown/lotto_6aus49';
import lottoEurojackpotTests from './tests/dropdown/lotto_eurojackpot';
import lottoGluecksspiraleTests from './tests/dropdown/lottogluecksspirale';
import lottoKenoTests from './tests/dropdown/lotto_keno';
import movieCinema1Tests from './tests/dropdown/movie-cinema1';
import movieCinema2Tests from './tests/dropdown/movie-cinema2';
import newsTests from './tests/dropdown/news';
import newsStoryTests from './tests/dropdown/news-story-of-the-day';
import offersTests from './tests/dropdown/offers';
import unitConverterTests from './tests/dropdown/unit-converter';
import simpleTests from './tests/dropdown/simple';
import soccerLigaGameTests from './tests/dropdown/soccer-liga-game';
import soccerLigaGroupTests from './tests/dropdown/soccer-liga-group';
import soccerLigaGroup2Tests from './tests/dropdown/soccer-liga-group2';
import soccerLigaTableTests from './tests/dropdown/soccer-liga-table';
import soccerLiveTickerTests from './tests/dropdown/soccer-live-ticker';
import suggestionsIntegrationTests from './tests/dropdown/suggestions-integration';
import timeTests from './tests/dropdown/time';
import twoSimpleTests from './tests/dropdown/two_simple';
import weatherTests from './tests/dropdown/weather';
import youtubeTests from './tests/dropdown/youtube';

import newMixerNewsTests from './tests/dropdown/new-mixer/news';
import newMixerHistoryAndNewsTests from './tests/dropdown/new-mixer/history_and_news';
import newMixerHistoryClusterTests from './tests/dropdown/new-mixer/history-cluster';
import newMixerLotto6Aus49Tests from './tests/dropdown/new-mixer/lotto_6aus49';
import newMixerBigMachineWithButtonsTests from './tests/dropdown/new-mixer/big-machine-with-buttons';
import newMixerLottoEurojackpotTests from './tests/dropdown/new-mixer/lotto_eurojackpot';
import newMixerLottoKenoTests from './tests/dropdown/new-mixer/lotto_keno';
import newMixerBigMachineWithRichDataTests from './tests/dropdown/new-mixer/big-machine-rich-data';

chai.use(chaiDom);

const oldMixerTests = [
  historyAndNewsTests,
  historyClusterTests,
  newsTests,
  lotto6Aus49Tests,
  bigMachineWithButtonsTests,
  lottoEurojackpotTests,
  lottoKenoTests,
  bigMachineWithRichDataTests,
  adultQuestionIntegrationTests,
  suggestionsIntegrationTests,
  unitConverterTests,
];
const newMixerTests = [
  newMixerNewsTests,
  newMixerHistoryAndNewsTests,
  newMixerHistoryClusterTests,
  newMixerLotto6Aus49Tests,
  newMixerBigMachineWithButtonsTests,
  newMixerLottoEurojackpotTests,
  newMixerLottoKenoTests,
  newMixerBigMachineWithRichDataTests,
];

DEPS.DropdownTests = ['core/utils'];
TESTS.DropdownTests = function (utils) {
  const config = getModule('core/config').default;
  const isOldMixer = utils.getPref('searchMode', 'autocomplete') === 'autocomplete';
  const hasHistoryUrl = Boolean(config.settings.HISTORY_URL);
  const isAskingForGeoConsent = config.settings.geolocation !== 'yes';
  const sectionName = `dropdown (${isOldMixer ? 'old' : 'new'} mixer)`;
  const mixerDependentTests = isOldMixer ? oldMixerTests : newMixerTests;
  describe(sectionName, function () {
    mixerDependentTests.forEach(test => test({ hasHistoryUrl }));
    adultQuestionTests();
    calculatorTests();
    currencyConverterTests();
    defaultSearchEngineTests();
    flightsTests();
    geoWithLocalTests();
    geoWithoutLocalTests({ isAskingForGeoConsent });
    keyboardNavigationCalculatorTests();
    keyboardNavigationCurrencyConverterTests();
    keyboardNavigationTwoSimpleTests();
    keyboardNavigationTwoSimpleWithoutAutocompleteTests();
    keyboardNavigationUnitConverterTests();
    lottoGluecksspiraleTests();
    movieCinema1Tests({ isAskingForGeoConsent });
    movieCinema2Tests();
    newsStoryTests();
    offersTests();
    simpleTests();
    soccerLigaGameTests();
    soccerLigaGroupTests();
    soccerLigaGroup2Tests();
    soccerLigaTableTests();
    soccerLiveTickerTests();
    timeTests();
    twoSimpleTests();
    weatherTests();
    youtubeTests();
  });
};
