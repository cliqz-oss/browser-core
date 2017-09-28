import BaseResult from './base';
import GenericResult from './generic';

class TimeSource extends BaseResult {
  get source() {
    return this.rawResult.title;
  }
}

export default class extends GenericResult {
  get template() {
    return 'time';
  }

  get extra() {
    return this.rawResult.data.extra || {};
  }

  get answer() {
    return this.extra.answer;
  }

  get location() {
    return this.extra.mapped_location;
  }

  get expression() {
    return this.extra.expression;
  }

  get timeZone() {
    return this.extra.line3;
  }

  get timeSource() {
    return new TimeSource({
      url: this.rawResult.url,
      title: this.rawResult.title,
      text: this.query,
    });
  }

  get selectableResults() {
    return [];
  }

  get allResults() {
    return [
      this.timeSource,
    ];
  }
}
