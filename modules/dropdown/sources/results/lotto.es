import BaseResult from './base';
import utils from '../../core/utils';

class LottoButton extends BaseResult {
  get displayUrl() {
    return this.rawResult.text;
  }

  get elementId() {
    return this.rawResult.elementId;
  }

  click() {
    this.rawResult.onClick();
  }
}

export default class extends BaseResult {
  get template() {
    return 'lotto';
  }

  get currentLottoType() {
    const extra = this.rawResult.data.extra || {};
    return extra.lotto_type || 'unknown';
  }

  get lottoList() {
    const extra = this.rawResult.data.extra || {};
    const key = Object.keys(extra.lotto_list)[0];
    return extra.lotto_list[key] || {};
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

  getTableData(rawData) {
    const gs = rawData;
    const dataSet = [];
    const romanNumber = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    const nKlasse = 7;

    for (let i = 0; i < nKlasse; i += 1) {
      const klasse = romanNumber[i];
      const currenRow = gs.gewinnzahlen[i];
      const gewinnzahlen = typeof currenRow === 'string' ? [currenRow] : currenRow;
      let monatlich = '';

      const currency = gs.waehrung === 'EUR' ? utils.getLocalizedString('lotto-euro') : '';
      const rente = utils.getLocalizedString('lotto-rente');

      const anzahl = parseFloat(gs.quoten[i].anzahl)
        .toLocaleString(this.locale, { minimumFractionDigits: 1 })
        .concat('x');
      let quote = parseFloat(gs.quoten[i].quote)
        .toLocaleString(this.locale, { minimumFractionDigits: 2 })
        .concat(currency);

      if (gs.quoten[i].text) {
        monatlich = gs.quoten[i].text.split(' ')[0];
        quote = [quote].concat(`(${monatlich}${currency} ${rente})`);
      }

      dataSet.push([klasse, gewinnzahlen, anzahl, quote]);
    }

    return dataSet;
  }

  get getGlueckspiraleResults() {
    const gs = this.lottoList.gs;

    const lottoResults = [
      {
        result: gs.gewinnzahlen[6][0].split(''),
        description: 'lotto-gewinnklasse7',
      },
      {
        result: gs.gewinnzahlen[6][1].split(''),
        description: 'lotto-gewinnklasse7',
      },
    ];

    if (this.showTable) {
      lottoResults.push({
        table: {
          data: this.getTableData(gs),
          columns: [
            'lotto-klasse',
            'lotto-gewinnzahlen',
            'lotto-gewinne',
            'lotto-quoten',
          ],
        }
      });
    }
    return lottoResults;
  }

  get showExpandButton() { // Temporarily disable the 'expand' button
    return false; // return this.currentLottoType === 'glueckspirale';
  }

  get internalResults() {
    const buttons = [];
    if (this.showExpandButton && !this.showTable) {
      buttons.push(new LottoButton({
        title: 'lotto-expand',
        url: `cliqz-actions,${JSON.stringify({ type: 'lotto', actionName: 'expand' })}`,
        text: this.rawResult.text,
        elementId: 'lotto-expand-button',
        onClick: () => {
          this.showTable = true;
          this.actions.replaceResult(this, this);
        }
      }));
    }
    return [
      ...buttons,
      ...super.internalResults,
    ];
  }

}
