import Rx from '../../platform/lib/rxjs';
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

  search(query, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const isQueryUrl = isUrl(query);

    let next;
    let result = {
      provider: this.id,
    };
    const observable = Rx.Observable.create((o) => {
      next = o.next.bind(o);
    });

    loadSearchEngines().then(() => {
      if (isQueryUrl) {
        const url = fixURL(query);
        result = {
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
      } else {
        const engine = getEngineByQuery(query);
        const rawQuery = getSearchEngineQuery(engine, query);
        result = {
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
      }

      next(
        getResponse(
          this.id,
          config,
          query,
          [result],
          'done',
        ),
      );
    });

    return observable.let(this.getOperators());
  }
}
