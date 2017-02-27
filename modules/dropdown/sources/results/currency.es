import BaseResult from './base';

export default class extends BaseResult {

  get template() {
    return 'currency';
  }

  get toAmount() {
    return this.rawResult.data.extra.toAmount.main;
  }

  get toCurrency() {
    return this.rawResult.data.extra.toCurrency;
  }

  get fromCurrency() {
    return this.rawResult.data.extra.fromCurrency;
  }

  get multiplyer() {
    return this.rawResult.data.extra.multiplyer;
  }

  get conversionRate() {
    return this.rawResult.data.extra.mConversionRate;
  }
}
