/* global describe, TESTS */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */


import simpleTests from './tests/dropdown/simple';
import historyTests from './tests/dropdown/history';
import twoSimpleTests from './tests/dropdown/two_simple';
import currencyConverterTests from './tests/dropdown/currency_converter';
import weatherTests from './tests/dropdown/weather';
import newsTests from './tests/dropdown/news';
import lottoGluecksspiraleTests from './tests/dropdown/lottogluecksspirale';
import lotto6Aus49Tests from './tests/dropdown/lotto_6aus49';
import bigMachineWithButtonsTests from './tests/dropdown/big-machine-with-buttons';
import lottoEurojackpotTests from './tests/dropdown/lotto_eurojackpot';
import lottoKenoTests from './tests/dropdown/lotto_keno';
import bigMachineWithRichDataTests from './tests/dropdown/big-machine-rich-data';
import geoWithoutLocalTests from './tests/dropdown/geo_without_consent';
import geoWithLocalTests from './tests/dropdown/geo_yes';
import adultQuestionTests from './tests/dropdown/adult-question';
import offersTests from './tests/dropdown/offers';

TESTS.DropdownTests = function () {
  describe('dropdown', function () {
    simpleTests();
    historyTests();
    twoSimpleTests();
    currencyConverterTests();
    weatherTests();
    newsTests();
    lottoGluecksspiraleTests();
    lotto6Aus49Tests();
    bigMachineWithButtonsTests();
    lottoEurojackpotTests();
    lottoKenoTests();
    bigMachineWithRichDataTests();
    geoWithoutLocalTests();
    geoWithLocalTests();
    adultQuestionTests();
    offersTests();
  });
};
