/* global CLIQZ */
/* global window */
/* global document */

Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
const System = CLIQZ.System;
const Calculator = System.get('autocomplete/calculator').default;

window.doCalculator = function () {
  try {
    const query = document.getElementById('input').value;
    Calculator.isCalculatorSearch(query);
    const result = Calculator.calculate(query);
    document.getElementById('result').innerHTML = result.data.extra.answer;
  } catch (e) {
    document.getElementById('result').innerHTML = e.message;
  }
};

