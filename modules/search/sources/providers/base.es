import Rx from '../../platform/lib/rxjs';

import { getEmptyResponse } from '../responses';

import apply from '../operators/apply';
import collect from '../operators/collect';
import normalize from '../operators/normalize';

export default class BaseProvider {
  constructor(id) {
    this.id = id;
  }

  getEmptySearch(config, query) {
    return Rx.Observable.from([getEmptyResponse(this.id, config, query)]);
  }

  // default operators used for most providers
  getOperators() {
    return observable => observable
      .scan(collect)
      .delay(1)
      .map(response => apply(response, normalize))
      .share();
  }
}
