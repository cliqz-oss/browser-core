/* global Components */
import Rx from '../../platform/lib/rxjs';
import utils from '../../core/utils';
import BaseProvider from './base';

// operators
import apply from '../operators/apply';
import collect from '../operators/collect';
import clean from '../operators/clean';
import deduplicate from '../operators/deduplicate';
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
      kind: 'H',
    },
  })
);

export default class History extends BaseProvider {
  constructor() {
    super('history');
  }

  search(query, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    return this.historySearch(query, config)
      .delay(0)
      // TODO: add alternative condition (e.g., > 3 results returned)
      .bufferTime(1)
      .filter(r => r.length > 0)
      .scan(collect, getPendingResponse(this.id, config, query))
      // to make `combineLatest` emit immediately
      .startWith(getPendingResponse(this.id, config, query))
      // `cliqzStreamDeduplicated` won't get the first history result otherwise,
      // supposingly because it subscribes too late (i.e., after `historyStream`
      // emmitted its first result); is there another way to synchonise?
      // `publish` did not seem to work
      .delay(1)
      .map(response => apply(response, normalize))
      .map(response => apply(response, clean))
      .map(deduplicate)
      .share();
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
