/* global describe, TESTS */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */

import simpleTests from './tests/dropdown/simple';
import historyTests from './tests/dropdown/history';
import twoSimpleTests from './tests/dropdown/two_simple';
import weatherTests from './tests/dropdown/weather';
import newsTests from './tests/dropdown/news';
import lotto6Aus49Tests from './tests/dropdown/lotto_6aus49';

TESTS.DropdownTests = function () {
  describe('dropdown', function () {
    simpleTests();
    historyTests();
    twoSimpleTests();
    weatherTests();
    newsTests();
    lotto6Aus49Tests();
  });
};
