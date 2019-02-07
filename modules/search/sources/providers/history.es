/* global Components */
import { Observable } from 'rxjs';
import { map, scan, share, filter } from 'rxjs/operators';
import utils from '../../core/utils';
import BaseProvider from './base';

// operators
import apply from '../operators/apply';
import collect from '../operators/collect';
import clean from '../operators/clean';
import deduplicate from '../operators/results/deduplicate';
import normalize from '../operators/normalize';
import { hasMainLink } from '../operators/links/utils';

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
  }));

export default class History extends BaseProvider {
  constructor() {
    super('history');
  }

  search(query, config, { allowEmptyQuery = false }) {
    if (!query && !allowEmptyQuery) {
      return this.getEmptySearch(config);
    }

    const results$ = this.historySearch(query, config)
      .pipe(
        // do not emit empty, pending results to reduce flickering
        filter(response =>
          !(response.state === 'pending' && response.results.length === 0)),
        map(r => [r]),
        scan(collect, getPendingResponse(this.id, config, query)),
        map(response => apply(response, normalize)),
        map(response => apply(response, clean)),
        map(({ results, ...response }) => ({
          ...response,
          results:
            // TODO: deduplicate is again called in enriched, try to simplify;
            //       at the moment, both is needed: here because history returns
            //       duplicates (like http://cliqz.com and https://cliqz.com) and
            //       in enrich to remove rich data/history duplicates
            // filter out results without main link (clean above removes links)
            deduplicate(results.filter(hasMainLink)),
        })),
        share()
      );

    return results$;
  }

  historySearch(query = '', config) {
    return Observable.create((observer) => {
      utils.historySearch(query, (results) => {
        const r = mapResults(results.results, query);

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
