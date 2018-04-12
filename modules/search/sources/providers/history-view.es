import Rx from '../../platform/lib/rxjs';
import BaseProvider from './base';

// responses
import { getResponse } from '../responses';

export default class HistoryView extends BaseProvider {
  constructor() {
    super('historyView');
  }

  search(query, config) {
    if (!query || !config.providers[this.id].isEnabled) {
      return this.getEmptySearch(config);
    }

    return Rx.Observable.from([getResponse(
      this.id,
      config,
      query,
      [{
        text: query,
        query,
        data: {
          kind: ['history-ui'],
          template: 'sessions',
        },
      }],
      'done'
    )])
      .let(this.getOperators(config, query));
  }
}
