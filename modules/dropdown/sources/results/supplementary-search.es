import BaseResult from './base';
import utils from '../../core/utils';

export default class SupplementarySearchResult extends BaseResult {
  isNotAutocompleteable = true;

  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);
  }

  click(window, _, ev) {
    if (this.rawResult.data.source === 'Cliqz') {
      this.actions.query(this.suggestion);
    } else {
      // we need to delegate the search queries to Firefox to ensure
      // that their SAP probes are working as expected
      // https://firefox-source-docs.mozilla.org/browser/browser/BrowserUsageTelemetry.html#browserusagetelemetry
      // https://hg.mozilla.org/mozilla-central/file/tip/toolkit/components/telemetry/Histograms.json#l8032
      super.click(window, this.suggestion, ev);
    }
  }

  isUrlMatch(href) {
    // we need to override isUrlMatch as in some cases the value of
    // 'href' is the bare query and not a full url. Please see the comment
    // from click
    return href === this.suggestion || href === this.url;
  }

  get template() {
    return 'search';
  }

  get engines() {
    if (!this._engines) {
      this._engines = utils.getSearchEngines();
    }

    return this._engines;
  }

  get defaultSearchEngine() {
    if (!this._defaultSearchEngine) {
      this._defaultSearchEngine = this.engines.find(se => se.default);
    }

    return this._defaultSearchEngine;
  }

  // it is not history but makes the background color to be light gray
  get isHistory() {
    // it appears as history if its a default search result or
    // as a regular result if its a suggestion
    return this.defaultSearchResult;
  }

  get isDeletable() {
    return false;
  }

  get kind() {
    const engine = this.getEngineByQuery();
    return [
      engine ? 'custom-search' : 'default-search',
    ];
  }

  get icon() {
    return 'search';
  }

  get displayText() {
    const engine = this.getEngineByQuery();
    const query = this.suggestion || this.rawResult.text;

    if (engine && engine.alias) {
      return query.replace(engine.alias, '').trim();
    }

    return query;
  }

  get suggestion() {
    return this.rawResult.data.suggestion;
  }

  get query() {
    return this.suggestion;
  }

  get engine() {
    return this.rawResult.data.source || this.searchEngine.name;
  }

  get defaultSearchResult() {
    return !this.rawResult.url;
  }

  get searchEngine() {
    const engine = this.getEngineByQuery();

    if (engine) {
      return engine;
    }

    return this.defaultSearchEngine;
  }

  // returns undefined if no token go detected
  getEngineByQuery() {
    const token = this.rawResult.data.suggestion.split(' ')[0];
    const engines = this.engines;
    return engines.find(e => e.alias === token);
  }

  get url() {
    return this.rawUrl;
  }

  get rawUrl() {
    return this.searchEngine.getSubmissionForQuery(this.displayText);
  }

  get displayUrl() {
    return this.rawResult.data.suggestion;
  }
}
