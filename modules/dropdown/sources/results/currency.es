import BaseResult, { Subresult } from './base';
import i18n from '../../core/content/i18n';
import { setTimeout } from '../../core/timers';

export default class CurrencyResult extends BaseResult {
  get template() {
    return 'currency';
  }

  get url() {
    return `cliqz-actions,${JSON.stringify({ type: 'currency', actionName: 'copy' })}`;
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get toAmount() {
    return (this._extra.toAmount || {}).main;
  }

  get fromAmount() {
    return this._extra.fromAmount;
  }

  get toCurrency() {
    return this._extra.toCurrency;
  }

  get toCurrencyName() {
    return this._extra.toCurrencyName;
  }

  // FIXME: symbols not displayed (encoding issue?)
  get toSymbol() {
    return this._extra.toSymbol
      || this._extra.toCurrency;
  }

  get fromCurrency() {
    return this._extra.fromCurrency;
  }

  // FIXME: symbols not displayed (encoding issue?)
  get fromSymbol() {
    // API v2 uses 'formCurrency' instead of 'fromCurrency'
    return this._extra.formCurrency
      || this._extra.fromCurrency;
  }

  get multiplyer() {
    return this._extra.multiplyer;
  }

  get conversionRate() {
    return this._extra.mConversionRate;
  }

  get allResults() {
    return [
      this.sourceWrapper,
      this,
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

  click(href, ev) {
    if (href === this.rawResult.url) {
      this.sourceWrapper.click(href, ev);
      return;
    }

    this.resultTools.actions.copyToClipboard(this.toAmount);
    this.$tooltip.innerText = i18n.getMessage('copied');
    setTimeout(() => {
      this.$tooltip.style.display = 'none';
    }, 1000);
  }

  get sourceWrapper() {
    return new Subresult(this, {
      url: this.rawResult.url,
      title: 'source',
      text: this.query,
      meta: this.rawResult.meta,
    });
  }
}
