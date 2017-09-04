import BaseResult from './base';
import utils from '../../core/utils';

export default class SupplementarySearchResult extends BaseResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);

    this.engines = utils.getSearchEngines();
    this.defaultSearchEngine = this.engines.find(se => se.default);
  }

  click(...args) {
    if (this.rawResult.data.source === 'Cliqz') {
      this.actions.query(this.suggestion);
    } else {
      super.click(...args);
    }
  }

  get template() {
    return 'search';
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

  get query() {
    const engine = this.getEngineByQuery();
    const query = this.rawResult.text;

    if (engine) {
      return query.split(' ').slice(1).join(' ');
    }

    return query;
  }

  get suggestion() {
    return this.rawResult.data.suggestion;
  }

  get engine() {
    return this.rawResult.data.source || this.searchEngine.name;
  }

  get defaultSearchResult() {
    return this.rawResult.defaultSearchResult || false;
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
    return this.searchEngine.getSubmissionForQuery(this.rawResult.data.suggestion);
  }

  get displayUrl() {
    return this.rawResult.data.suggestion;
  }
}
