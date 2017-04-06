import BaseResult from './base';

export default class extends BaseResult {

  get template() {
    return 'calculator';
  }

  get query() {
    return this.rawResult.text;
  }

  get result() {
    return this.rawResult.title || (this.rawResult.data.extra || {}).answer;
  }

  get title() {
    return this.rawResult.title;
  }
}
