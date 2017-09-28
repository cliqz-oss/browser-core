/* global Components */
import Rx from '../../platform/lib/rxjs';
import { getHistory } from '../../platform/history/search';
import BaseProvider from './base';

const mapResults = (results, query) =>
  results.map(r => ({
    url: r.value,
    title: r.comment,
    originalUrl: r.value,
    type: r.style,
    text: query,
    provider: 'history',
    data: {
      ...r,
      kind: 'H',
    },
  })
);

export default class History extends BaseProvider {
  constructor() {
    super('history');
  }

  search(query) {
    if (!query) {
      return this.empty;
    }

    return this.historySearch(query)
      .delay(0);
  }

  historySearch(query = '') {
    return Rx.Observable.create((observer) => {
      getHistory(query, (results) => {
        observer.next({
          results: mapResults(results.results, query),
          state: results.ready ? 'done' : 'pending',
          provider: this.id,
        });

        if (results.ready) {
          observer.complete();
        }
      });
    });
  }
}
