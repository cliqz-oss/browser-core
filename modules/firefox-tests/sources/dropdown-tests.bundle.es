/* global describe, TESTS */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */


import simpleTests from './tests/dropdown/simple';
import twoSimpleTests from './tests/dropdown/two_simple';
import currencyConverterTests from './tests/dropdown/currency_converter';
import weatherTests from './tests/dropdown/weather';
import newsTests from './tests/dropdown/news';
import historyAndNewsTests from './tests/dropdown/history_and_news';
import historyClusterTests from './tests/dropdown/history-cluster';
import lottoGluecksspiraleTests from './tests/dropdown/lottogluecksspirale';
import lotto6Aus49Tests from './tests/dropdown/lotto_6aus49';
import bigMachineWithButtonsTests from './tests/dropdown/big-machine-with-buttons';
import lottoEurojackpotTests from './tests/dropdown/lotto_eurojackpot';
import lottoKenoTests from './tests/dropdown/lotto_keno';
import bigMachineWithRichDataTests from './tests/dropdown/big-machine-rich-data';
import geoWithoutLocalTests from './tests/dropdown/geo_without_consent';
import geoWithLocalTests from './tests/dropdown/geo_yes';
import adultQuestionTests from './tests/dropdown/adult-question';
import timeTests from './tests/dropdown/time';
import offersTests from './tests/dropdown/offers';
import soccerLigaGameTests from './tests/dropdown/soccer-liga-game';
import soccerLigaTableTests from './tests/dropdown/soccer-liga-table';
import soccerLiveTickerTests from './tests/dropdown/soccer-live-ticker';
import flightNoInfoTests from './tests/dropdown/flight-no-info';
import flightArrivedTests from './tests/dropdown/flight-arrived';


TESTS.DropdownTests = function () {
  describe('dropdown', function () {
    simpleTests();
    twoSimpleTests();
    currencyConverterTests();
    weatherTests();
    newsTests();
    historyAndNewsTests();
    historyClusterTests();
    lottoGluecksspiraleTests();
    lotto6Aus49Tests();
    bigMachineWithButtonsTests();
    lottoEurojackpotTests();
    lottoKenoTests();
    bigMachineWithRichDataTests();
    geoWithoutLocalTests();
    geoWithLocalTests();
    adultQuestionTests();
    timeTests();
    offersTests();
    soccerLigaGameTests();
    soccerLigaTableTests();
    soccerLiveTickerTests();
    flightNoInfoTests();
    flightArrivedTests();
  });
};
