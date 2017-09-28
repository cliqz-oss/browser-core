import Rx from '../../platform/lib/rxjs';
import { isUrl } from '../../core/url';
import BaseProvider from './base';

export default class InstantProvider extends BaseProvider {
  constructor() {
    super('instant');
  }

  search(query) {
    if (!query) {
      return this.empty;
    }

    const isQueryUrl = isUrl(query);
    const type = isQueryUrl ? 'navigate-to' : 'supplementary-search';

    return Rx.Observable.from([{
      results: [{
        type,
        text: query,
        data: {
          suggestion: query,
        },
        provider: this.id,
      }],
      state: 'done',
      provider: this.id,
    }]);
  }
}
