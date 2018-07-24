import Rx from '../../platform/lib/rxjs';
import {
  isUrl,
  getSearchEngineUrl,
  getVisitUrl,
  fixURL
} from '../../core/url';
import BaseProvider from './base';
import { getResponse } from '../responses';
import * as searchUtils from '../../core/search-engines';
import { PROVIDER_INSTANT } from '../consts';

const getSearchEngineQuery = (engine, query) => {
  if (engine && engine.alias) {
    return query.replace(engine.alias, '').trim();
  }

  return query;
};

export default class InstantProvider extends BaseProvider {
  constructor() {
    super(PROVIDER_INSTANT);
  }

  getEngineByQuery(query) {
    const token = query.split(' ')[0];
    const engines = searchUtils.getSearchEngines();
    return engines.find(e => e.alias === token) ||
      searchUtils.getDefaultSearchEngine();
  }

  getKind(query) {
    const engine = this.getEngineByQuery(query);
    const kind = engine ? 'custom-search' : 'default-search';
    return [kind];
  }

  search(query, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const isQueryUrl = isUrl(query);

    let result = {
      provider: this.id,
    };

    if (isQueryUrl) {
      const url = fixURL(query);
      result = {
        ...result,
        type: 'navigate-to',
        url: query,
        text: query,
        data: {
          extra: {
            mozActionUrl: getVisitUrl(url),
          },
          kind: ['navigate-to'],
        }
      };
    } else {
      const engine = this.getEngineByQuery(query);
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

    return Rx.Observable.from([getResponse(
      this.id,
      config,
      query,
      [result],
      'done'
    )])
      .let(this.getOperators());
  }
}
