import BaseResult from './base';
import utils from '../../core/utils';

export default class SupplementarySearchResult extends BaseResult {

  get template() {
    return 'search';
  }

  // it is not history but makes the background color to be light gray
  get isHistory() {
    return true;
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

  get engine() {
    return this.searchEngine.name;
  }

  get searchEngine() {
    const engine = this.getEngineByQuery();

    if (engine) {
      return engine;
    }

    return utils.getDefaultSearchEngine();
  }

  // returns undefined if no token go detected
  getEngineByQuery() {
    const token = this.rawResult.text.split(' ')[0];
    const engines = utils.getSearchEngines();
    return engines.find(e => e.alias === token);
  }

  get url() {
    return this.searchEngine.getSubmissionForQuery(this.query);
  }

  get displayUrl() {
    return this.rawResult.text;
  }
}
