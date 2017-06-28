import BaseResult from './results/base';
import CalculatorResult from './results/calculator';
import CurrencyResult from './results/currency';
import WeatherResult from './results/weather';
import HistoryCluster from './results/history';
import SessionsResult from './results/sessions';
import AdultQuestionResult from './results/adult-question';
import LottoResult from './results/lotto';
import { equals } from '../core/url';
import console from '../core/console';

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

    if (rawResult.data.template === 'lotto') {
      Constructor = LottoResult;
    }

    if (rawResult.data.urls) {
      Constructor = HistoryCluster;
    }

    if (rawResult.type === 'cliqz-pattern' && !rawResult.data.urls) {
      throw new Error('ignore');
    }

    return new Constructor(rawResult, allResultsFlat);
  }

  static createAll(rawResults, actions = {}) {
    const all = rawResults.reduce(({ resultList, allResultsFlat }, rawResult) => {
      let result;

      try {
        result = ResultFactory.create(rawResult, allResultsFlat);
        result.actions = actions;
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
  constructor({
    query,
    rawResults,
    queriedAt,
    sessionCountPromise,
    queryCliqz,
    adultAssistant,
    locationAssistant,
    rerender,
    getSnippet,
  } = {}) {
    this.rerender = rerender;
    this.query = query;
    this.queriedAt = queriedAt;

    const actions = {
      locationAssistant,
      adultAssistant,
      replaceResult: this.replaceResult.bind(this),
      getSnippet,
    };
    this.results = ResultFactory.createAll(rawResults, actions);

    if (this.hasAdultResults) {
      if (adultAssistant.isBlockingAdult) {
        this.results = this.results.filter(result => !result.isAdult);
      }

      if (adultAssistant.isAskingForAdult) {
        this.addAdultQuestionResult({
          onButtonClick: queryCliqz.bind(null, this.query),
          adultAssistant,
        }, actions);
      }
    }

    if (this.hasHistory && sessionCountPromise) {
      // TEMP: this.addSessionsResult(sessionCountPromise);
    }

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
    return this.selectableResults.find(r => equals(r.url, href) || equals(r.rawUrl, href));
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

  replaceResult(oldResult, newResult) {
    const index = this.indexOf(oldResult);
    this.results.splice(index, 1, newResult);
    this.rerender();
  }

  insertAt(result, index) {
    this.results = [
      ...this.results.slice(0, index),
      result,
      ...this.results.slice(index),
    ];
  }

  addSessionsResult(countPromise) {
    const firstNonHistoryIndex = this.results.findIndex(r => !r.isHistory);
    const sessionResult = new SessionsResult({
      query: this.query,
    }, countPromise);

    this.insertAt(
      sessionResult,
      firstNonHistoryIndex >= 0 ? firstNonHistoryIndex : this.results.length,
    );
  }

  addAdultQuestionResult({ onButtonClick, adultAssistant }, actions = {}) {
    const result = new AdultQuestionResult({
      text: this.query,
      onButtonClick,
    });
    result.actions = actions;
    this.prepend(result);
  }

  get hasHistory() {
    return this.results.some(r => r.isHistory);
  }

  get hasAdultResults() {
    return this.results.some(r => r.isAdult);
  }
}
