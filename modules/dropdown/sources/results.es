import BaseResult from './results/base';
import CalculatorResult from './results/calculator';
import CurrencyResult from './results/currency';
import WeatherResult from './results/weather';
import HistoryResult from './results/history';
import { equals } from '../../core/url';
import console from '../../core/console';

class ResultFactory {
  static create(rawResult, allResultsFlat) {
    let Constructor = BaseResult;

    if (['custom', 'noResult'].indexOf(rawResult.data.template) >= 0) {
      throw new Error('ignore');
    }

    if (rawResult.data.template === 'calculator') {
      if (rawResult.data.extra.ez_type) {
        throw new Error('ignore');
      }
      Constructor = CalculatorResult;
    }

    if (rawResult.data.template === 'currency') {
      Constructor = CurrencyResult;
    }

    if (rawResult.data.template === 'weatherEZ' || rawResult.data.template === 'weatherAlert') {
      Constructor = WeatherResult;
    }

    if (rawResult.data.urls) {
      Constructor = HistoryResult;
    }

    if (rawResult.type === 'cliqz-pattern' && !rawResult.data.urls) {
      throw new Error('ignore');
    }

    return new Constructor(rawResult, allResultsFlat);
  }

  static createAll(rawResults) {
    const all = rawResults.reduce(({ resultList, allResultsFlat }, rawResult) => {
      let result;

      try {
        result = ResultFactory.create(rawResult, allResultsFlat);
      } catch (e) {
        if (['duplicate', 'ignore'].indexOf(e.message) >= 0) {
          // it is expected to have duplicates
        } else {
          throw e;
        }
      }

      if (result) {
        resultList.push(result);
      }


      return {
        resultList,
        allResultsFlat,
      };
    }, { resultList: [], allResultsFlat: [] });

    return all.resultList;
  }
}

export default class Results {

  constructor({ query, rawResults, queriedAt }) {
    this.query = query;
    this.queriedAt = queriedAt;
    this.results = ResultFactory.createAll(rawResults);
    this.displayedAt = Date.now();
  }

  get selectableResults() {
    return this.results.reduce((all, result) => ([
      ...all,
      ...result.selectableResults,
    ]), []);
  }

  get length() {
    return this.selectableResults.length;
  }

  get firstResult() {
    return this.get(0);
  }

  get lastResult() {
    return this.get(this.selectableResults.length - 1);
  }

  get(index) {
    return this.selectableResults[index];
  }

  find(href) {
    return this.results.find((result) => {
      if (!result.hasUrl) {
        console.error('Result does not implement #hasUrl', result);
        return false;
      }
      return result.hasUrl(href);
    });
  }

  findSelectable(href) {
    return this.selectableResults.find(r => equals(r.url, href));
  }

  indexOf(result) {
    return this.results.findIndex(r => r === result);
  }

  get kinds() {
    return this.results.map(result => result.kind);
  }

  prepend(result) {
    this.results.unshift(result);
  }

}
