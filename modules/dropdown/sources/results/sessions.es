import BaseResult from './base';
import config from '../../core/config';

const sessionsUrl = query => ([
  config.settings.HISTORY_URL,
  config.settings['modules.history.search-path'],
  encodeURIComponent(query),
].join(''));

export default class SessionsResult extends BaseResult {
  constructor(rawResult) {
    super({
      ...rawResult,
      url: sessionsUrl(rawResult.text),
    });
  }

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

  click(window, href, ev) {
    // Let Firefox handle the urlbar value
    super.click(window, this.rawResult.url, ev);
  }
}
