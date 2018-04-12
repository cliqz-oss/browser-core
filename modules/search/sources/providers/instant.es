import Rx from '../../platform/lib/rxjs';
import { isUrl } from '../../core/url';
import BaseProvider from './base';
import { getResponse } from '../responses';
import utils from '../../core/utils';

export default class InstantProvider extends BaseProvider {
  constructor() {
    super('instant');
  }

  getEngineByQuery(query) {
    const token = query.split(' ')[0];
    const engines = utils.getSearchEngines();
    return engines.find(e => e.alias === token);
  }

  getKind(query) {
    const engine = this.getEngineByQuery(query);
    return engine ? 'custom-search' : 'default-search';
  }

  search(query, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const isQueryUrl = isUrl(query);
    const type = isQueryUrl ? 'navigate-to' : 'supplementary-search';
    const kind = [isQueryUrl ? 'navigate-to' : this.getKind(query)];

    return Rx.Observable.from([getResponse(
      this.id,
      config,
      query,
      [{
        type,
        text: query,
        url: this.getRawUrl(query),
        data: {
          suggestion: query,
          kind,
        },
        provider: this.id,
      }],
      'done'
    )])
      .let(this.getOperators(config, query));
  }

  getRawUrl(query) {
    return utils.getDefaultSearchEngine().getSubmissionForQuery(query);
  }
}
