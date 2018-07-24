import Rx from '../../platform/lib/rxjs';
import BaseProvider from './base';
import { getResponse } from '../responses';
import utils from '../../core/utils';
import { getSearchEngineUrl } from '../../core/url';
import * as searchUtils from '../../core/search-engines';

export default class QuerySuggestionProvider extends BaseProvider {
  constructor() {
    super('query-suggestions');
  }

  suggestionsNotAllowed(query, params) {
    // We are not requesing query suggestion for url-like queries
    // (like starting with "htt"), pasted or corrected queries.
    // This is what Mozilla does in Firefox so should we.
    return !query ||
      query.trim().startsWith('htt') ||
      params.isPasted ||
      ['Backspace', 'Delete'].includes(params.keyCode);
  }

  search(query, config, params) {
    if (!config.providers[this.id].isEnabled ||
        this.suggestionsNotAllowed(query, params)) {
      return this.getEmptySearch(config, query);
    }

    const engine = searchUtils.getDefaultSearchEngine();

    return Rx.Observable
      .fromPromise(utils.getSuggestions(query))
      .map(([q, suggestions]) => (getResponse(
        this.id,
        config,
        query,
        suggestions.map(suggestion => ({
          query: q,
          url: engine.getSubmissionForQuery(suggestion),
          text: suggestion,
          data: {
            suggestion,
            kind: ['Z'],
            extra: {
              searchEngineName: engine.name,
              mozActionUrl: getSearchEngineUrl(engine, suggestion, suggestion),
            },
          },
          type: 'supplementary-search',
        })),
        'done'
      )))
      .let(this.getOperators());
  }
}
