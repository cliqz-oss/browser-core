import GenericResult from './results/generic';
import CalculatorResult from './results/calculator';
import TimeResult from './results/time';
import CurrencyResult from './results/currency';
import WeatherResult from './results/weather';
import HistoryCluster from './results/history';
import SessionsResult from './results/sessions';
import AdultQuestionResult from './results/adult-question';
import SupplementarySearchResult from './results/supplementary-search';
import Suggestions from './results/suggestions';
import LottoResult from './results/lotto';
import SoccerResult from './results/soccer';
import FlightResult from './results/flight';
import MovieCinemaResult from './results/movie-cinema';
import { equals } from '../core/url';
import console from '../core/console';
import NavigateToResult from './results/navigate-to';
import NewsStory from './results/news-story';
import { isCliqzBrowser } from '../core/platform';

class ResultFactory {
  static create(rawResult, allResultsFlat) {
    let Constructor = GenericResult;
    if (['custom', 'noResult'].indexOf(rawResult.data.template) >= 0) {
      throw new Error('ignore');
    }

    if (rawResult.data.template === 'calculator') {
      if (rawResult.data.extra.ez_type) {
        if (rawResult.data.extra.ez_type === 'time') {
          Constructor = TimeResult;
        } else {
          throw new Error('ignore');
        }
      } else {
        Constructor = CalculatorResult;
      }
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

    if (rawResult.data.template === 'movieEZ' ||
        rawResult.data.template === 'cinemaEZ' ||
        rawResult.data.template === 'movie') {
      Constructor = MovieCinemaResult;
    }

    if (rawResult.data.template === 'suggestion') {
      Constructor = SupplementarySearchResult;
    }

    if (rawResult.data.template === 'inline-suggestion') {
      Constructor = Suggestions;
    }

    if (rawResult.data.template === 'ligaEZ1Game' ||
        rawResult.data.template === 'ligaEZTable' ||
        rawResult.data.template === 'ligaEZGroup' ||
        rawResult.data.template === 'liveTicker') {
      Constructor = SoccerResult;
    }

    if (rawResult.data.template === 'news') {
      Constructor = NewsStory;
    }

    if (rawResult.data.template === 'flight') {
      Constructor = FlightResult;
    }

    if (rawResult.data.urls) {
      Constructor = HistoryCluster;
    }

    if (rawResult.type === 'cliqz-pattern' && !rawResult.data.urls) {
      throw new Error('ignore');
    }

    if (rawResult.type === 'navigate-to') {
      Constructor = NavigateToResult;
    }

    if (rawResult.type === 'supplementary-search') {
      Constructor = SupplementarySearchResult;
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
    queryCliqz,
    adultAssistant,
    locationAssistant,
    rerender,
    getSnippet,
    copyToClipboard,
  } = {}) {
    this.rerender = rerender;
    this.query = query;
    this.queriedAt = queriedAt;

    const actions = {
      locationAssistant,
      adultAssistant,
      replaceResult: this.replaceResult.bind(this),
      getSnippet,
      copyToClipboard,
      query: queryCliqz,
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

    if (this.hasCalculatorResults || this.hasCurrencyResults) {
      // we should filter out suggestions if we have calculatpr or currency results
      this.results = this.results.filter(result => !result.isSuggestion);
    }

    if (isCliqzBrowser && this.hasHistory && (this.query !== '')) {
      this.addSessionsResult();
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
    return this.selectableResults.find(r => equals(r.rawUrl, href) || equals(r.url, href));
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

  addSessionsResult() {
    const firstHistoryIndex = this.results.findIndex(r => r.isHistory);
    const firstNonHistoryIndex = firstHistoryIndex +
      this.results.slice(firstHistoryIndex).findIndex(r => !r.isHistory);
    const sessionResult = new SessionsResult({
      query: this.query,
    });

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

  get hasCalculatorResults() {
    return this.results.some(r => r.isCalculator);
  }

  get hasCurrencyResults() {
    return this.results.some(r => r.isCurrency);
  }
}
