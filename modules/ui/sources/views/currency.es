export default class {
  constructor(win) {
    this.window = win;
  }
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
