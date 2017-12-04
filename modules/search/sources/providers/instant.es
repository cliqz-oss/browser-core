import Rx from '../../platform/lib/rxjs';
import { isUrl } from '../../core/url';
import BaseProvider from './base';
import { getResponse } from '../responses';

export default class InstantProvider extends BaseProvider {
  constructor() {
    super('instant');
  }

  search(query, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const isQueryUrl = isUrl(query);
    const type = isQueryUrl ? 'navigate-to' : 'supplementary-search';

    return Rx.Observable.from([getResponse(
      this.id,
      config,
      query,
      [{
        type,
        text: query,
        data: {
          suggestion: query,
        },
        provider: this.id,
      }],
      'done'
    )])
    .let(this.getOperators(config, query));
  }
}
