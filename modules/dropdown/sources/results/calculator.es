import BaseResult from './base';
import i18n from '../../core/content/i18n';
import { setTimeout } from '../../core/timers';

export default class CalculatorResult extends BaseResult {
  get template() {
    return 'calculator';
  }

  get displayUrl() {
    return this.rawResult.text;
  }

  get query() {
    return (this.rawResult.data.extra || {}).expression || this.rawResult.text;
  }

  get result() {
    return this.rawResult.title || (this.rawResult.data.extra || {}).answer;
  }

  get isRounded() {
    return (this.rawResult.data.extra || {}).isRounded;
  }

  get url() {
    return `cliqz-actions,${JSON.stringify({ type: 'calculator', actionName: 'copy' })}`;
  }

  get allResults() {
    return [this];
  }

  get selectableResults() {
    return [];
  }

  didRender($dropdown) {
    this.$calculator = $dropdown.querySelector('.calculator');
    this.$tooltip = this.$calculator.querySelector('.tooltip');
  }

  click() {
    this.resultTools.actions.copyToClipboard(this.result);
    this.$tooltip.innerText = i18n.getMessage('copied');
    setTimeout(() => {
      this.$tooltip.style.display = 'none';
    }, 1000);
  }
}
