import Rx from '../../platform/lib/rxjs';
import { fetch as f } from '../../core/http';
import { getDefaultEngineSuggestionUrl } from '../../core/search-engines';
import BaseProvider from './base';
import { getResponse } from '../responses';

export default class QuerySuggestionProvider extends BaseProvider {
  constructor() {
    super('query-suggestions');
  }

  fetch(query) {
    const url = getDefaultEngineSuggestionUrl(query);
    if (url) {
      return f(url).then(res => res.json());
    }
    return Promise.resolve([query, []]);
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
      return this.getEmptySearch(config);
    }

    return Rx.Observable
      .fromPromise(this.fetch(query))
      .map(([q, suggestions]) => (getResponse(
        this.id,
        config,
        query,
        suggestions.map(suggestion => ({
          query: q,
          data: {
            suggestion,
            kind: ['Z'],
          },
          type: 'supplementary-search',
        })),
        'done'
      )))
      .let(this.getOperators(config, query));
  }
}
