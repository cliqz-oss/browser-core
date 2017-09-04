import BaseResult from './base';
import utils from '../../core/utils';
import { copyToClipboard } from '../../core/clipboard';

export default class extends BaseResult {

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

  get title() {
    return this.rawResult.title;
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
    copyToClipboard(this.rawResult.title);
    this.$tooltip.innerText = utils.getLocalizedString('Copied');
    setTimeout(() => {
      this.$tooltip.style.display = 'none';
    }, 1000);
  }
}
