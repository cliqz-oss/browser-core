import BaseResult, { Subresult } from './base';
import i18n from '../../core/content/i18n';

export default class CurrencyResult extends BaseResult {
  get template() {
    return 'currency';
  }

  get url() {
    return `cliqz-actions,${JSON.stringify({ type: 'currency', actionName: 'copy' })}`;
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
    this.$tooltip.innerText = i18n.getMesasge('Copied');
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
