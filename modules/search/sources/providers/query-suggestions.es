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

  search(query, config) {
    if (!query || !config.providers[this.id].isEnabled) {
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
          },
          type: 'supplementary-search',
        })),
        'done'
      )))
      .let(this.getOperators(config, query));
  }
}
