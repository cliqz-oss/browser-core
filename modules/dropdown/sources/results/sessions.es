import BaseResult from './base';

export default class SessionsResult extends BaseResult {
  get elementId() {
    return `result-sessions-${this.rawResult.text}`;
  }

  get template() {
    return 'sessions';
  }

  get displayUrl() {
    return this.rawResult.text;
  }

  get isHistory() {
    return true;
  }

  get isDeletable() {
    return false;
  }
}
