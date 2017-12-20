import utils from '../../core/utils';

export default class Lotto {

  enhanceResults(data) {
    this.data = data;
    data.localeDate = this.localeDate;
    data.lottoResults = this.lottoResults;
  }

  get currentLottoType() {
    return this.data.lotto_type || 'unknown';
  }

  get lottoList() {
    const key = Object.keys(this.data.lotto_list)[0];
    return this.data.lotto_list[key] || {};
  }

  get locale() {
    return utils.getLocalizedString('locale_lang_code');
  }

  get localeDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    const date = this.lottoList.date;
    if (date) {
      return new Date(date).toLocaleDateString(this.locale, options);
    }
    return '';
  }

  get lottoResults() {
    let results = [];
    switch (this.currentLottoType) {
      case '6aus49':
        results = this.get6aus49Results;
        break;
      case 'eurojackpot':
        results = this.getEurojackpotResults;
        break;
      case 'keno':
        results = this.getKenoResults;
        break;
      case 'glueckspirale':
        results = this.getGlueckspiraleResults;
        break;
      default:
        results = [];
    }
    return results;
  }

  get get6aus49Results() {
    const lotto = this.lottoList.lotto;
    const spiel77 = this.lottoList.spiel77;
    const super6 = this.lottoList.super6;

    return [
      {
        result: lotto.gewinnzahlen.concat(lotto.superzahl),
        classNames: 'circle highlight-last',
        description: 'lotto-superzahl',
      },
      {
        result: ['Spiel77'].concat(spiel77.gewinnzahlen.split('')),
        classNames: 'normal bold-first',
      },
      {
        result: ['Super6'].concat(super6.gewinnzahlen.split('')),
        classNames: 'normal bold-first',
      },
    ];
  }

  get getEurojackpotResults() {
    const ej = this.lottoList.ej;
    return [
      {
        result: ej.gewinnzahlen,
        classNames: 'circle',
        description: 'lotto-5aus50',
      },
      {
        result: ej.zwei_aus_acht,
        classNames: 'circle',
        description: 'lotto-2aus8',
      },
    ];
  }

  get getKenoResults() {
    const keno = this.lottoList.keno;
    const plus5 = this.lottoList.plus5;
    return [
      {
        result: keno.gewinnzahlen.slice(0, 10),
      },
      {
        result: keno.gewinnzahlen.slice(10, 20),
      },
      {
        result: ['plus5'].concat(plus5.gewinnzahlen.split('')),
        classNames: 'normal bold-first',
      },
    ];
  }

  get getGlueckspiraleResults() {
    const gs = this.lottoList.gs;
    return [
      {
        result: gs.gewinnzahlen[6][0].split(''),
        description: 'lotto-gewinnklasse7',
      },
      {
        result: gs.gewinnzahlen[6][1].split(''),
        description: 'lotto-gewinnklasse7',
      },
    ];
  }
}
