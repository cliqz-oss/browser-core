/* global window */
/* global document */
import Calculator from '../calculator';

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

