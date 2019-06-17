import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import BaseProvider from './base';
import { getResponse } from '../responses';
import { getSearchEngineUrl } from '../../core/url';
import * as searchUtils from '../../core/search-engines';
import { PREVENT_AUTOCOMPLETE_KEYS } from '../consts';

export default class QuerySuggestionProvider extends BaseProvider {
  constructor() {
    super('querySuggestions');
  }

  suggestionsNotAllowed(query, params) {
    // We are not requesing query suggestion for url-like queries
    // (like starting with "htt"), pasted or corrected queries.
    // This is what Mozilla does in Firefox so should we.
    return !query
      || query.trim().startsWith('htt')
      || params.isPasted
      || PREVENT_AUTOCOMPLETE_KEYS.includes(params.keyCode);
  }

  search(query, config, params) {
    if (!config.providers[this.id].isEnabled
        || this.suggestionsNotAllowed(query, params)) {
      return this.getEmptySearch(config, query);
    }

    const engine = searchUtils.getDefaultSearchEngine();

    return from(searchUtils.getSuggestions(query))
      .pipe(
        map(([q, suggestions]) => (
          getResponse({
            provider: this.id,
            config,
            query,
            results: suggestions
              .filter(suggestion => suggestion !== query)
              .map(suggestion => ({
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
            state: 'done'
          })
        )),
        this.getOperators()
      );
  }
}
