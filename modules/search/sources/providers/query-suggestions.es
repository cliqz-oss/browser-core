import Rx from '../../platform/lib/rxjs';
import { fetch as f } from '../../core/http';
import { getDefaultEngineSuggestionUrl } from '../../core/search-engines';
import BaseProvider from './base';

export default class QuerySuggestionProvider extends BaseProvider {
  constructor() {
    super('query-suggestions');
  }

  fetch(query) {
    const url = getDefaultEngineSuggestionUrl(query);
    return f(url).then(res => res.json());
  }

  search(query) {
    if (!query) {
      return this.empty;
    }

    return Rx.Observable
      .fromPromise(this.fetch(query))
      .map(([q, suggestions]) => ({
        results: suggestions.map(suggestion => ({
          query: q,
          data: {
            suggestion,
          },
          type: 'supplementary-search',
        })),
        provider: this.id
      }));
  }
}
