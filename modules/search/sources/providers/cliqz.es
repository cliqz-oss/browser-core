import Rx from '../../platform/lib/rxjs';
import utils from '../../core/utils';
import BackendProvider from './backend';
import { getResponse } from '../responses';

export default class Cliqz extends BackendProvider {
  constructor() {
    super('cliqz');
    this.cache = new Map();
  }

  fetch(query) {
    return utils.getBackendResults(query)
      .then(e => e.response);
  }

  search(query, config) {
    if (!query) {
      return this.getEmptySearch(config);
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
      .map(response => getResponse(
        this.id,
        config,
        query,
        this.mapResults(response),
        'done',
      ))
      // .do(results => this.cache.set(query, results))
      .delay(0)
      .let(this.getOperators(config, query));
    // .flatMap(results =>
    //   Rx.Observable.from(results));
  }
}
