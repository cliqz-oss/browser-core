import BaseResult from './base';

export default class NavigateToResult extends BaseResult {
  get template() {
    return 'navigate-to';
  }

  // it is not history but makes the background color to be light gray
  get isHistory() {
    return true;
  }

  get isDeletable() {
    return false;
  }

  get isActionSwitchTab() {
    return false;
  }

  get kind() {
    return ['navigate-to'];
  }

  get url() {
    return this.rawResult.data.extra.mozActionUrl;
  }

  get displayUrl() {
    return this.rawResult.text;
  }
}
