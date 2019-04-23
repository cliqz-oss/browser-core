import GenericResult from './results/generic';
import CalculatorResult from './results/calculator';
import TimeResult from './results/time';
import CurrencyResult from './results/currency';
import WeatherResult from './results/weather';
import DialingCodeResult from './results/dialing-code';
import HistoryCluster from './results/history';
import SessionsResult from './results/sessions';
import AdultQuestionResult from './results/adult-question';
import OffersResult from './results/offer';
import SupplementarySearchResult from './results/supplementary-search';
import LottoResult from './results/lotto';
import SoccerResult from './results/soccer';
import FlightResult from './results/flight';
import SingleVideoResult from './results/single-video';
import MovieResult from './results/movie';
import CinemaResult from './results/cinema';
import NavigateToResult from './results/navigate-to';
import NewsStory from './results/news-story';
import TopNews from './results/top-news';

class ResultFactory {
  static create(rawResult, resultTools) {
    let Constructor = GenericResult;
    if (['custom', 'noResult'].indexOf(rawResult.data.template) >= 0) {
      throw new Error('ignore');
    }

    if (rawResult.data.template === 'calculator') {
      Constructor = CalculatorResult;
    }

    if (rawResult.data.template === 'currency') {
      Constructor = CurrencyResult;
    }

    if (rawResult.data.template === 'time') {
      Constructor = TimeResult;
    }

    if (rawResult.data.template === 'weatherEZ' || rawResult.data.template === 'weatherAlert') {
      Constructor = WeatherResult;
    }

    if (rawResult.data.template === 'dialing-code') {
      Constructor = DialingCodeResult;
    }

    if (rawResult.data.template === 'lotto') {
      Constructor = LottoResult;
    }

    if (rawResult.data.template === 'offer') {
      Constructor = OffersResult;
    }

    if (rawResult.data.template === 'movie') {
      Constructor = MovieResult;
    }

    if (rawResult.data.template === 'movie-showtimes'
        || rawResult.data.template === 'cinemaEZ') {
      Constructor = CinemaResult;
    }

    if (rawResult.data.template === 'sessions') {
      Constructor = SessionsResult;
    }

    if (rawResult.data.template === 'ligaEZ1Game'
        || rawResult.data.template === 'ligaEZTable'
        || rawResult.data.template === 'ligaEZGroup'
        || rawResult.data.template === 'liveTicker') {
      Constructor = SoccerResult;
    }

    if (rawResult.data.template === 'news') {
      Constructor = NewsStory;
    }

    if (rawResult.data.template === 'top-news-sc') {
      Constructor = TopNews;
    }

    if (rawResult.data.template === 'single-video') {
      Constructor = SingleVideoResult;
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

    return new Constructor(rawResult, resultTools);
  }

  static createAll(rawResults, resultTools) {
    return rawResults.reduce((resultList, rawResult) => {
      try {
        const result = ResultFactory.create(
          rawResult,
          resultTools,
        );

        resultList.push(result);
      } catch (e) {
        if (['duplicate', 'ignore'].indexOf(e.message) >= 0) {
          // it is expected to have duplicates
        } else {
          throw e;
        }
      }

      return resultList;
    }, []);
  }
}

export default class Results {
  constructor(
    {
      query,
      rawResults,
      queriedAt,
    },
    resultTools,
  ) {
    this.resultTools = {
      ...resultTools,
      actions: {
        ...resultTools.actions,
        replaceResult: this.replaceResult,
      },
      results: this,
    };

    this.query = query;
    this.queriedAt = queriedAt;

    this.results = ResultFactory.createAll(rawResults, this.resultTools);

    if (this.hasAdultResults) {
      if (this.resultTools.assistants.adult.isBlockingAdult) {
        this.results = this.results.filter(result => !result.isAdult);
      }

      if (this.resultTools.assistants.adult.isAskingForAdult) {
        this.addAdultQuestionResult(resultTools);
      }
    }

    if (this.hasCalculatorResults || this.hasCurrencyResults) {
      // we should filter out suggestions if we have calculatpr or currency results
      this.results = this.results.filter(result => !result.isSuggestion);
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
        return false;
      }
      return result.hasUrl(href);
    });
  }

  findSelectable(href) {
    return this.selectableResults.find(r => r.url === href);
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

  replaceResult = (oldResult, newResult) => {
    const index = this.indexOf(oldResult);
    this.results.splice(index, 1, newResult);
    this.resultTools.actions.rerender();
  };

  insertAt(result, index) {
    this.results = [
      ...this.results.slice(0, index),
      result,
      ...this.results.slice(index),
    ];
  }

  addAdultQuestionResult() {
    const result = new AdultQuestionResult({
      text: this.query,
    }, this.resultTools);
    const insertAtIndex = this.firstResult && this.firstResult.defaultSearchResult ? 1 : 0;
    this.insertAt(result, insertAtIndex);
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

  get lastHistoryIndex() {
    for (let i = this.results.length - 1; i >= 0; i -= 1) {
      if (this.results[i].isHistory) {
        return i + 1;
      }
    }
    return 0;
  }

  get historyResults() {
    return this.results.slice(0, this.lastHistoryIndex);
  }

  get genericResults() {
    return this.results.slice(this.lastHistoryIndex);
  }
}
