import { Observable } from 'rxjs';
import {
  isUrl,
  getSearchEngineUrl,
  getVisitUrl,
  fixURL,
} from '../../core/url';
import {
  getEngineByQuery,
  getSearchEngineQuery,
  loadSearchEngines,
} from '../../core/search-engines';
import BaseProvider from './base';
import { getResponse } from '../responses';
import { PROVIDER_INSTANT } from '../consts';

export default class InstantProvider extends BaseProvider {
  constructor() {
    super(PROVIDER_INSTANT);
  }

  getKind(query) {
    const engine = getEngineByQuery(query);
    const kind = engine ? 'custom-search' : 'default-search';
    return [kind];
  }

  search(query = '', config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const isQueryUrl = isUrl(query);

    let next;
    const result = {
      provider: this.id,
    };
    const observable = Observable.create((o) => {
      next = o.next.bind(o);
    });

    loadSearchEngines().then(() => {
      const url = fixURL(query);

      const navigateResult = {
        ...result,
        type: 'navigate-to',
        url,
        friendlyUrl: url,
        text: query,
        data: {
          extra: {
            mozActionUrl: getVisitUrl(url),
          },
          kind: ['navigate-to'],
        }
      };

      const engine = getEngineByQuery(query);
      const rawQuery = getSearchEngineQuery(engine, query);

      const supplementarySearchResult = {
        ...result,
        type: 'supplementary-search',
        url: engine.getSubmissionForQuery(query),
        text: rawQuery,
        data: {
          kind: this.getKind(query),
          suggestion: query,
          extra: {
            mozActionUrl: getSearchEngineUrl(engine, query, rawQuery),
            searchEngineName: engine.name,
          },
        }
      };

      const results = isQueryUrl
        ? [navigateResult, supplementarySearchResult]
        : [supplementarySearchResult];

      next(
        getResponse({
          provider: this.id,
          config,
          query,
          results,
          state: 'done',
        }),
      );
    });

    return observable.pipe(this.getOperators());
  }
}
