import { Observable } from 'rxjs';
import { map, scan, share, filter } from 'rxjs/operators';
import historySearch from '../../core/history-search';
import inject from '../../core/kord/inject';
import BaseProvider from './base';
import { queryTabs } from '../../core/tabs';

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
    this.historyLookup = inject.module('history-search');
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
    const searchFunc = (q, cb) => {
      if (config.providers.history.isHistoryLookupEnabled) {
        return this.historyLookup.action('search', q).then(cb);
      }

      return historySearch(q, cb);
    };

    return Observable.create((observer) => {
      let readyCtr = 0;
      const tabSearchEnabled = config.providers.history.isTabSearchEnabled;
      const expectedResults = tabSearchEnabled ? 2 : 1;
      const completeIfLast = () => {
        readyCtr += 1;
        if (readyCtr >= expectedResults) {
          observer.complete();
        }
      };

      searchFunc(query, (results) => {
        const r = mapResults(results.results, query);

        observer.next(getResponse({
          provider: this.id,
          config,
          query,
          results: r,
          state: results.ready ? 'done' : 'pending'
        }));

        if (results.ready) {
          completeIfLast();
        }
      }, config.isPrivateMode);

      if (tabSearchEnabled) {
        queryTabs().then((tabs) => {
          const lq = query.toLowerCase();
          // basic filtering: match keyword in url or title
          const results = tabs.filter(tab => !tab.active
            && !tab.incognito
            && (tab.url.indexOf(lq) !== -1 || tab.title.toLowerCase().indexOf(lq) !== -1))
            .sort((a, b) => b.lastAccessed - a.lastAccessed) // most recently used first
            .map(tab => ({
              originalUrl: tab.url,
              provider: 'tabs',
              text: query,
              url: tab.url,
              style: 'action switchtab',
              type: 'action switchtab',
              title: tab.title,
            }));
          observer.next(
            getResponse({
              provider: this.id,
              config,
              query,
              results,
              state: 'done',
            })
          );
          completeIfLast();
        });
      }
    });
  }
}
