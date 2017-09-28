import BaseResult from './base';
import utils from '../../core/utils';
import { copyToClipboard } from '../../core/clipboard';

class CurrencyCopyResult {
  constructor({ toAmount, toCurrencyName, actions }) {
    this.toAmount = toAmount;
    this.toCurrencyName = toCurrencyName;
    this.actions = actions;
  }

  get url() {
    return `cliqz-actions,${JSON.stringify({ type: 'currency', actionName: 'copy' })}`;
  }

  click() {
    copyToClipboard(this.toAmount);
    this.actions.updateTooltip(utils.getLocalizedString('Copied'));
    utils.setTimeout(() => this.actions.hideTooltip(), 1000);
  }
}

export default class extends BaseResult {

  get template() {
    return 'currency';
  }

  get toAmount() {
    return this.rawResult.data.extra.toAmount.main;
  }

  get fromAmount() {
    return this.rawResult.data.extra.fromAmount;
  }

  get toCurrency() {
    return this.rawResult.data.extra.toCurrency;
  }

  get toCurrencyName() {
    const extra = this.rawResult.data.extra;
    return extra.toCurrencyName || this.toCurrency;
  }

  // FIXME: symbols not displayed (encoding issue?)
  get toSymbol() {
    return this.rawResult.data.extra.toSymbol ||
      this.rawResult.data.extra.toCurrency;
  }

  get fromCurrency() {
    return this.rawResult.data.extra.fromCurrency;
  }

  // FIXME: symbols not displayed (encoding issue?)
  get fromSymbol() {
    // API v2 uses 'formCurrency' instead of 'fromCurrency'
    return this.rawResult.data.extra.formCurrency ||
      this.rawResult.data.extra.fromCurrency;
  }

  get multiplyer() {
    return this.rawResult.data.extra.multiplyer;
  }

  get conversionRate() {
    return this.rawResult.data.extra.mConversionRate;
  }

  get currencyCopyResult() {
    if (this._currencyCopyResult) {
      return this._currencyCopyResult;
    }

    this._currencyCopyResult = new CurrencyCopyResult({
      toAmount: this.rawResult.data.extra.toAmount.main,
      toCurrencyName: this.toCurrencyName,
      actions: {
        updateTooltip: this.updateTooltip.bind(this),
        hideTooltip: this.hideTooltip.bind(this),
      },
    });

    return this._currencyCopyResult;
  }

  get allResults() {
    return [
      this,
      this.currencyCopyResult,
    ];
  }

  get selectableResults() {
    return [];
  }

  didRender($dropdown) {
    this.$currency = $dropdown.querySelector('.currency');
    this.$tooltip = this.$currency.querySelector('.tooltip');
  }

  updateTooltip(text) {
    this.$tooltip.innerText = text;
  }

  hideTooltip() {
    this.$tooltip.style.display = 'none';
  }

}
