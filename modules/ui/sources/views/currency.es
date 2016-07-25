/**
* @namespace ui.views
*/
export default class {
  /**
  * @class Currency
  * @constructor
  * @param win
  */
  constructor(win) {
    this.window = win;
  }
  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {
    if (typeof Intl != "undefined" && Intl.NumberFormat) {
      data.CurrencyFormatSuport = true;

      //First param is the Locale: en-US....
      var currency_formatter = new this.window.Intl.NumberFormat(CliqzUtils.PREFERRED_LANGUAGE, {
        style: 'currency',
        currency: data.toCurrency,
        minimumFractionDigits: 2,
      });

      if (data.toAmount.main) {
        data.toAmount.main = currency_formatter.format(data.toAmount.main);
      }
    } else {
      data.CurrencyFormatSuport = false;
    }
  }
};
