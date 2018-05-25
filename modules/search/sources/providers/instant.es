import Rx from '../../platform/lib/rxjs';
import { isUrl, fixURL } from '../../core/url';
import BaseProvider from './base';
import { getResponse } from '../responses';
import utils from '../../core/utils';

const getSearchEngineQuery = (engine, query) => {
  if (engine && engine.alias) {
    return query.replace(engine.alias, '').trim();
  }

  return query;
};

export const getSearchEngineUrl = (engine, query, rawQuery) => `moz-action:searchengine,${JSON.stringify({
  engineName: engine.name,
  input: query,
  searchQuery: rawQuery,
  alias: engine.alias,
})}`;

export default class InstantProvider extends BaseProvider {
  constructor() {
    super('instant');
  }

  getEngineByQuery(query) {
    const token = query.split(' ')[0];
    const engines = utils.getSearchEngines();
    return engines.find(e => e.alias === token) ||
      utils.getDefaultSearchEngine();
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
      const mozActionUrl = `moz-action:visiturl,${JSON.stringify({ url: fixURL(query) })}`;
      result = {
        ...result,
        type: 'navigate-to',
        url: query,
        text: query,
        data: {
          extra: {
            mozActionUrl,
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
