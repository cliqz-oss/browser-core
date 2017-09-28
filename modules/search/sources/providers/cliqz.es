import Rx from '../../platform/lib/rxjs';
import { fetch as f } from '../../core/http';
import utils from '../../core/utils';
import BaseProvider from './base';

const mapResults = results =>
  results.map((result) => {
    const snippet = result.snippet || {};
    return {
      ...result,
      url: result.url,
      originalUrl: result.url,
      title: snippet.title,
      type: result.type,
      text: results.q,
      description: snippet.description,
      provider: 'cliqz',
      data: {
        ...snippet,
        template: result.template,
      },
    };
  });

export default class Cliqz extends BaseProvider {
  constructor() {
    super('cliqz');
    this.cache = new Map();
  }

  fetch(query) {
    const url = utils.RESULTS_PROVIDER +
      utils.getResultsProviderQueryString(query);

    return f(url)
      .then(res => res.json());
  }

  search(query) {
    if (!query) {
      return this.empty;
    }
    // if (this.cache.has(query)) {
    //   return Rx.Observable
    //     .from([this.cache.get(query)])
    //     // need to delay, otherwise results come
    //     // before mixer start (mixer also subscribes
    //     // to query)
    //     .delay(1);
    // }

    return Rx.Observable
      .fromPromise(this.fetch(query))
      .map(results => ({
        results: mapResults(results.results),
        state: 'done',
        provider: this.id,
      }))
      // .do(results => this.cache.set(query, results))
      .delay(0);
      // .flatMap(results =>
      //   Rx.Observable.from(results));
  }
}
