import BaseResult from './base';
import config from '../../core/config';

const sessionsUrl = query => ([
  config.baseURL,
  config.settings['modules.history.search-path'],
  encodeURIComponent(query),
].join(''));

export default class extends BaseResult {

  constructor(rawResult, countPromise) {
    super({
      url: sessionsUrl(rawResult.query),
      ...rawResult,
    });

    this.countPromise = countPromise;
  }

  get elementId() {
    return `result-sessions-${this.rawResult.query}`;
  }

  get template() {
    return 'sessions';
  }

  get displayUrl() {
    return this.rawResult.query;
  }

  get isHistory() {
    return true;
  }

  get isDeletable() {
    return false;
  }

  didRender(dropdownElement) {
    this.countPromise.then((count) => {
      const el = dropdownElement.querySelector(`#${this.elementId}`);
      if (el) {
        el.querySelector('.count').innerText = count;
      }
    });
  }

  click(window, href, ev) {
    // Let Firefox handle the urlbar value
    super.click(window, this.rawResult.url, ev);
  }
}
