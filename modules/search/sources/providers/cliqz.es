import Rx from '../../platform/lib/rxjs';
import utils from '../../core/utils';
import BaseProvider from './base';
import { getResponse } from '../responses';

const mapResults = ({ results, q }) =>
  results.map((result) => {
    const snippet = result.snippet || {};
    return {
      ...result,
      url: result.url,
      originalUrl: result.url,
      title: snippet.title,
      type: result.type,
      text: q,
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
        mapResults(response),
        'done',
      ))
      // .do(results => this.cache.set(query, results))
      .delay(0)
      .let(this.getOperators(config, query));
      // .flatMap(results =>
      //   Rx.Observable.from(results));
  }
}
