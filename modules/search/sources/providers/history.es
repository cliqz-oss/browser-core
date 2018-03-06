/* global Components */
import Rx from '../../platform/lib/rxjs';
import utils from '../../core/utils';
import BaseProvider from './base';

// operators
import apply from '../operators/apply';
import collect from '../operators/collect';
import clean from '../operators/clean';
import deduplicate from '../operators/results/deduplicate';
import normalize from '../operators/normalize';

// responses
import { getResponse, getPendingResponse } from '../responses';

const mapResults = (results, query) =>
  results.map(r => ({
    url: r.value,
    title: r.comment,
    originalUrl: r.value,
    type: r.style,
    style: r.style,
    text: query,
    provider: 'history',
    data: {
      ...r,
      kind: ['H'],
    },
  })
  );

export default class History extends BaseProvider {
  constructor() {
    super('history');
  }

  search(query, config, { allowEmptyQuery = false }) {
    if (!query && !allowEmptyQuery) {
      return this.getEmptySearch(config);
    }

    const { providers: { history: { maxQueryLengthToWait } = {} } = {} } = config;

    const results$ = this.historySearch(query, config)
      // do not emit empty, pending results to reduce flickering
      .filter(response =>
        !(response.state === 'pending' && response.results.length === 0))
      // stabilize history clustering to reduce flickering
      .bufferTime(5)
      .filter(r => r.length > 0)
      .scan(collect, getPendingResponse(this.id, config, query))
      .map(response => apply(response, normalize))
      .map(response => apply(response, clean))
      .map(({ results, ...response }) =>
        ({ results: deduplicate(results), ...response }))
      .share();

    // do not wait for (actual) history results if query
    // is longer than N to increase responsiveness for "seach on
    // Google" query preview; if query is long, it's likely that
    // history has responded already (for a previous partial query),
    // therefore flickering is not a big issue anymore
    // TODO: make this independent of specific query length and dependend
    //       on if the history provider has returned results for a previous
    //       (partial) query in the current search session
    if (query.length >= maxQueryLengthToWait) {
      return results$
        .startWith(getPendingResponse(this.id, config, query))
        // FIXME: there is some race condition which requires having a delay
        .delay(1);
    }

    return results$;
  }

  historySearch(query = '', config) {
    let hasResults = false;
    return Rx.Observable.create((observer) => {
      utils.historySearch(query, (results) => {
        const r = mapResults(results.results, query);
        hasResults = hasResults || !!results.results.length;

        if (results.ready && hasResults) {
          r.push({
            text: query,
            query,
            data: {
              kind: ['history-ui'],
              template: 'sessions',
            },
          });
        }

        observer.next(getResponse(
          this.id,
          config,
          query,
          r,
          results.ready ? 'done' : 'pending'
        ));

        if (results.ready) {
          observer.complete();
        }
      }, utils.isPrivateMode(config.window));
    });
  }
}
