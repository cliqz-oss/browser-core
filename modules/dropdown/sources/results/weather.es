import BaseResult, { getDeepResults } from './base';

class InternalResult extends BaseResult {
}

export default class extends BaseResult {

  get template() {
    return 'weather';
  }

  get todayDate() {
    return this.rawResult.data.extra.todayWeekday;
  }

  get url() {
    return null;
  }

  get today() {
    const extra = this.rawResult.data.extra;
    return {
      date: extra.todayWeekday,
      icon: extra.todayIcon,
      minTemp: extra.todayMin,
      maxTemp: extra.todayMax,
    };
  }

  get forecast() {
    return this.rawResult.data.extra.forecast;
  }

  get selectableResults() {
    return this.internalResults;
  }

  get internalResults() {
    const deepLinks = getDeepResults(this.rawResult, 'buttons');

    return deepLinks.map(({ url, title }) => new InternalResult({
      url,
      title,
      text: this.query
    }));
  }
}
