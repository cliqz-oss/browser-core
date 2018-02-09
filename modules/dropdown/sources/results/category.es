import BaseResult from './base';

export default class Category extends BaseResult {
  get template() {
    return 'category';
  }

  get title() {
    return this.rawResult.title;
  }
}
