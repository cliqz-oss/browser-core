/* global Components */
import { Observable } from 'rxjs';
import BaseProvider from './base';
import inject from '../../core/kord/inject';

// responses
import { getResponse } from '../responses';

const mapResults = (results, query) =>
  results.map(r => ({
    url: r.value,
    title: r.comment,
    originalUrl: r.value,
    type: r.style,
    style: r.style,
    text: query,
    provider: 'historyLookup',
    data: {
      ...r,
      kind: ['H'],
    },
  }));

export default class HistoryLookup extends BaseProvider {
  constructor() {
    super('historyLookup');
    this.historyLookup = inject.module('history-search');
  }

  search(query, config, { allowEmptyQuery = false }) {
    if (!config.providers[this.id].isEnabled || (!query && !allowEmptyQuery)) {
      return this.getEmptySearch(config);
    }

    return Observable.create((observer) => {
      this.historyLookup.action('search', query).then((results) => {
        const r = mapResults(results.results, query);
        observer.next(getResponse(
          this.id,
          config,
          query,
          r,
          'done',
        ));

        observer.complete();
      });
    }).pipe(this.getOperators());
  }
}
