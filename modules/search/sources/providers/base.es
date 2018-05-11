import Rx from '../../platform/lib/rxjs';

import { getEmptyResponse, getPendingResponse } from '../responses';

import apply from '../operators/apply';
import collect from '../operators/collect';
import normalize from '../operators/normalize';

export default class BaseProvider {
  constructor(id) {
    this.id = id;
  }

  getEmptySearch(config) {
    return Rx.Observable.from([getEmptyResponse(this.id, config)]);
  }

  // default operators used for most providers
  getOperators(config, query) {
    return observable => observable
      .scan(collect)
      .startWith(getPendingResponse(this.id, config, query))
      .delay(1)
      .map(response => apply(response, normalize))
      .share();
  }
}
