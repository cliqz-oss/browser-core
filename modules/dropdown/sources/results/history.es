import { equals } from '../../core/url';
import prefs from '../../core/prefs';
import BaseResult from './base';
import GenericResult from './generic';

class HistoryResult extends BaseResult {
  get isHistory() { return true; }
}

export default class HistoryCluster extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);

    // handle duplicates in data.urls
    // TODO: move to autocomplete module
    this.rawResult.data.urls = (this.rawResult.data.urls || []).reduce((filtered, result) => {
      const isDuplicate = allResultsFlat.some(url => equals(url, result.href));
      if (isDuplicate) {
        return filtered;
      }
      allResultsFlat.push(result.href);
      return [
        ...filtered,
        result,
      ];
    }, []);
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
}

