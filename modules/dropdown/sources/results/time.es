import GenericResult from './generic';

export default class TimeResult extends GenericResult {
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

  get selectableResults() {
    return [];
  }
}
