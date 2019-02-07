import { from } from 'rxjs';
import { scan, delay, map, share } from 'rxjs/operators';

import { getEmptyResponse } from '../responses';

import apply from '../operators/apply';
import collect from '../operators/collect';
import normalize from '../operators/normalize';

export default class BaseProvider {
  constructor(id) {
    this.id = id;
  }

  getEmptySearch(config, query) {
    return from([getEmptyResponse(this.id, config, query)]);
  }

  // default operators used for most providers
  getOperators() {
    return observable => observable.pipe(
      scan(collect),
      delay(1),
      map(response => apply(response, normalize)),
      share()
    );
  }
}
