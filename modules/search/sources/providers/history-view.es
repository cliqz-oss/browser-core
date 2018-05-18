import Rx from '../../platform/lib/rxjs';
import BaseProvider from './base';

// responses
import { getResponse } from '../responses';
import CONFIG from '../../core/config';

const sessionsUrl = query => ([
  CONFIG.settings.HISTORY_URL,
  CONFIG.settings['modules.history.search-path'],
  encodeURIComponent(query),
].join(''));

export default class HistoryView extends BaseProvider {
  constructor() {
    super('historyView');
  }

  search(query, config) {
    if (!query.trim() || !config.providers[this.id].isEnabled) {
      return this.getEmptySearch(config);
    }

    return Rx.Observable.from([getResponse(
      this.id,
      config,
      query,
      [{
        url: sessionsUrl(query),
        text: query,
        query,
        data: {
          kind: ['history-ui'],
          template: 'sessions',
        },
      }],
      'done'
    )])
      .let(this.getOperators());
  }
}
