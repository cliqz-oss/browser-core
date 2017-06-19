import CliqzUtils from '../../core/utils';

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
      data.extra.CurrencyFormatSuport = true;

      //First param is the Locale: en-US....
      var currency_formatter = new this.window.Intl.NumberFormat(CliqzUtils.PREFERRED_LANGUAGE, {
        style: 'currency',
        currency: data.extra.toCurrency,
        minimumFractionDigits: 2,
      });

      if (data.extra.toAmount.main) {
        data.extra.toAmount.main = currency_formatter.format(data.extra.toAmount.main);
      }
    } else {
      data.extra.CurrencyFormatSuport = false;
    }
  }
};
