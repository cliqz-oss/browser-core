import { equals } from '../../core/url';
import prefs from '../../core/prefs';
import BaseResult from './base';
import GenericResult from './generic';
import LottoResult from './lotto';

class HistoryResult extends BaseResult {
  get isHistory() { return true; }
}

export default class HistoryCluster extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);
  }

  get isHistory() {
    return true;
  }

  get template() {
    return 'history';
  }

  get description() {
    return null;
  }

  get results() {
    if (!this.historyResults) {
      this.historyResults = this.rawResult.data.urls.map(rawResult => new HistoryResult({
        ...rawResult,
        url: rawResult.href,
        bulletLogo: true,
        isCluster: true,
        text: this.rawResult.text,
      }));
    }
    return this.historyResults;
  }

  get internalResults() {
    const resultUrls = this.results.map(r => r.url);
    return super.internalResults
      .filter(result => !resultUrls.some(url => equals(result.url, url)));
  }

  get selectableResults() {
    return [
      ...(this.url ? [this] : []),
      ...this.newsResults,
      ...this.results,
      ...this.internalResults.slice(0, this.internalResultsLimit),
    ];
  }

  get internalResultsLogo() {
    const internalResults = this.internalResults || [];
    return internalResults.length > 0 ? this.logo : null;
  }

  // only include news in history cluster for new mixer
  get newsResults() {
    if (prefs.get('searchMode', 'autocomplete') !== 'search') {
      return [];
    }
    return super.newsResults;
  }

  // only include lotto in history cluster for new mixer
  get lottoResults() {
    if (prefs.get('searchMode', 'autocomplete') !== 'search') {
      return [];
    }

    const lottoResult = new LottoResult(this.rawResult);
    return lottoResult.lottoResults;
  }
}

