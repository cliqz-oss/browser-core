/* global TESTS, DEPS, getModule */

import chai from 'chai';
import chaiDom from 'chai-dom';
import { urlbar } from './tests/dropdown/helpers';

import adultQuestionTests from './tests/dropdown/adult-question';
import adultQuestionIntegrationTests from './tests/dropdown/adult-question-integration';
import autocompletionBackendAndHistoryTests from './tests/dropdown/autocompletion-backend-and-history';
import bigMachineWithButtonsTests from './tests/dropdown/big-machine-with-buttons';
import bigMachineWithRichDataTests from './tests/dropdown/big-machine-rich-data';
import calculatorTests from './tests/dropdown/calculator';
import currencyConverterTests from './tests/dropdown/currency_converter';
import defaultSearchEngineTests from './tests/dropdown/default-search-engine';
import flightsTests from './tests/dropdown/flights-template';
import historyAndNewsTests from './tests/dropdown/history_and_news';
import historyClusterTests from './tests/dropdown/history-cluster';
import keyboardNavigationAdultTests from './tests/dropdown/keyboard-navigation/adult-question';
import keyboardNavigationBmRichDataTests from './tests/dropdown/keyboard-navigation/bm-rich-data';
import keyboardNavigationBmWithButtonsTests from './tests/dropdown/keyboard-navigation/bm-with-buttons';
import keyboardNavigationCalculatorTypeTests from './tests/dropdown/keyboard-navigation/calculator-type';
import keyboardNavigationCurrencyConverterTests from './tests/dropdown/keyboard-navigation/currency-converter';
import keyboardNavigationFlightTypeTests from './tests/dropdown/keyboard-navigation/flight-type';
import keyboardNavigationLottoTypeTests from './tests/dropdown/keyboard-navigation/lotto-type';
import keyboardNavigationNewsTests from './tests/dropdown/keyboard-navigation/news';
import keyboardNavigationNewsStoryTests from './tests/dropdown/keyboard-navigation/news-story';
import keyboardNavigationSoccerGameTests from './tests/dropdown/keyboard-navigation/soccer-game';
import keyboardNavigationSoccerGroupTests from './tests/dropdown/keyboard-navigation/soccer-group';
import keyboardNavigationSoccerLivetickerTests from './tests/dropdown/keyboard-navigation/soccer-liveticker';
import keyboardNavigationSoccerTableTests from './tests/dropdown/keyboard-navigation/soccer-table';
import keyboardNavigationSimpleWithAutocompleteTests from './tests/dropdown/keyboard-navigation/simple-with-autocomplete';
import keyboardNavigationSimpleWithoutAutocompleteTests from './tests/dropdown/keyboard-navigation/simple-without-autocomplete';
import keyboardNavigationQuerySuggestionsTests from './tests/dropdown/keyboard-navigation/query-suggestions';
import keyboardNavigationWeatherTests from './tests/dropdown/keyboard-navigation/weather';
import keyboardNavigationYoutubeTests from './tests/dropdown/keyboard-navigation/youtube';
import localTests from './tests/dropdown/local';
import lotto6Aus49Tests from './tests/dropdown/lotto_6aus49';
import lottoEurojackpotTests from './tests/dropdown/lotto_eurojackpot';
import lottoGluecksspiraleTests from './tests/dropdown/lottogluecksspirale';
import lottoKenoTests from './tests/dropdown/lotto_keno';
import movieCinema1Tests from './tests/dropdown/movie-cinema1';
import movieCinema2Tests from './tests/dropdown/movie-cinema2';
import newsTests from './tests/dropdown/news';
import newsStoryTests from './tests/dropdown/news-story-of-the-day';
import offersNonOrganicV2Tests from './tests/dropdown/offers/non-organic-v2';
import unitConverterTests from './tests/dropdown/unit-converter';
import simpleTests from './tests/dropdown/simple';
import soccerLigaGameTests from './tests/dropdown/soccer-liga-game';
import soccerLigaGroupTests from './tests/dropdown/soccer-liga-group';
import soccerLigaGroup2Tests from './tests/dropdown/soccer-liga-group2';
import soccerLigaTableTests from './tests/dropdown/soccer-liga-table';
import soccerLiveTickerTests from './tests/dropdown/soccer-live-ticker';
import suggestionsIntegrationTests from './tests/dropdown/suggestions-integration';
import telemetryDropdownTests from './tests/dropdown/telemetry/dropdown';
import telemetryEmptyQueryTests from './tests/dropdown/telemetry/empty-query';
import telemetryFullUrlTests from './tests/dropdown/telemetry/full-url';
import telemetryKeystrokeTests from './tests/dropdown/telemetry/keystroke';
import telemetryNoDropdownTests from './tests/dropdown/telemetry/no-dropdown';
import telemetrySearchEngineTests from './tests/dropdown/telemetry/search-engine';
import telemetrySearchWithTests from './tests/dropdown/telemetry/search-with';
import telemetryTwoSimpleWithAutocompleteTests from './tests/dropdown/telemetry/two-simple-with-autocomplete';
import telemetryTwoSimpleWithoutAutocompleteTests from './tests/dropdown/telemetry/two-simple-without-autocomplete';
import telemetryUrlbarTests from './tests/dropdown/telemetry/urlbar';
import timeTests from './tests/dropdown/time';
import twoSimpleTests from './tests/dropdown/two_simple';
import weatherTests from './tests/dropdown/weather';
import youtubeTests from './tests/dropdown/youtube';

import newMixerAutocompletionBackendAndHistoryTests from './tests/dropdown/autocompletion-backend-and-history-new-mixer';
import newMixerHistoryAndNewsTests from './tests/dropdown/new-mixer/history_and_news';
import newMixerHistoryClusterTests from './tests/dropdown/new-mixer/history-cluster';

chai.use(chaiDom);

const oldMixerTests = [
  autocompletionBackendAndHistoryTests,
  historyAndNewsTests,
  historyClusterTests,
  adultQuestionIntegrationTests,
  defaultSearchEngineTests,
  keyboardNavigationAdultTests,
  keyboardNavigationQuerySuggestionsTests,
  suggestionsIntegrationTests,
  unitConverterTests,
  telemetryKeystrokeTests,
];
const newMixerTests = [
  newMixerAutocompletionBackendAndHistoryTests,
  newMixerHistoryAndNewsTests,
  newMixerHistoryClusterTests,
  offersNonOrganicV2Tests,
];

DEPS.DropdownTests = ['core/utils'];
TESTS.DropdownTests = function (utils) {
  const config = getModule('core/config').default;
  const isOldMixer = utils.getPref('searchMode', 'autocomplete') === 'autocomplete';
  const hasHistoryUrl = Boolean(config.settings.HISTORY_URL);
  const sectionName = `dropdown (${isOldMixer ? 'old' : 'new'} mixer)`;
  const mixerDependentTests = isOldMixer ? oldMixerTests : newMixerTests;

  describe(sectionName, function () {
    beforeEach(function () {
      this.currentTest.stopBlur = false;
    });

    afterEach(function () {
      if (!this.currentTest.stopBlur) {
        urlbar.mInputField.setUserInput('');
        urlbar.blur();
        urlbar.mInputField.blur();
      }
    });

    mixerDependentTests.forEach(test => test({ hasHistoryUrl }));
    adultQuestionTests();
    calculatorTests();
    bigMachineWithButtonsTests();
    bigMachineWithRichDataTests();
    currencyConverterTests();
    flightsTests();
    keyboardNavigationSimpleWithAutocompleteTests();
    keyboardNavigationBmRichDataTests();
    keyboardNavigationBmWithButtonsTests();
    keyboardNavigationCalculatorTypeTests();
    keyboardNavigationCurrencyConverterTests();
    keyboardNavigationFlightTypeTests();
    keyboardNavigationLottoTypeTests();
    keyboardNavigationNewsTests();
    keyboardNavigationNewsStoryTests();
    keyboardNavigationSoccerGameTests();
    keyboardNavigationSoccerGroupTests();
    keyboardNavigationSoccerLivetickerTests();
    keyboardNavigationSoccerTableTests();
    keyboardNavigationSimpleWithoutAutocompleteTests();
    keyboardNavigationYoutubeTests();
    keyboardNavigationWeatherTests();
    localTests();
    lotto6Aus49Tests();
    lottoEurojackpotTests();
    lottoGluecksspiraleTests();
    lottoKenoTests();
    movieCinema1Tests();
    movieCinema2Tests();
    newsTests();
    newsStoryTests();
    simpleTests();
    soccerLigaGameTests();
    soccerLigaGroupTests();
    soccerLigaGroup2Tests();
    soccerLigaTableTests();
    soccerLiveTickerTests();
    telemetryDropdownTests();
    telemetryEmptyQueryTests();
    telemetryFullUrlTests();
    telemetryNoDropdownTests();
    telemetrySearchEngineTests();
    telemetrySearchWithTests();
    telemetryTwoSimpleWithAutocompleteTests();
    telemetryTwoSimpleWithoutAutocompleteTests();
    telemetryUrlbarTests();
    timeTests();
    twoSimpleTests();
    weatherTests();
    youtubeTests();
  });
};
