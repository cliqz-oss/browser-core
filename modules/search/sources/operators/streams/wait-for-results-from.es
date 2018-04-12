import Rx from '../../../platform/lib/rxjs';

import { getPendingResponse } from '../../responses';
import { isDone, hasResults } from '../responses/utils';
import waitFor from './wait-for';

const { startWith } = Rx.operators;

/**
 * Operator that surpresses results from the source until the first result
 * from another provider has arrived, or until all other providers are done
 * (if none of them had a result before).
 *
 * @function waitForResultsFrom
 * @param {Observable[]} other - The other results to wait for.
 * @param {string} providerId - The provider ID of the source.
 * @param {Object} config - The config.
 * @returns {operator} The `waitForResultsFrom` operator.
 */
export default (others, providerId, config) => Rx.pipe(
  waitFor(
    Rx.Observable.merge(
      // emits as soon as all providers are done
      Rx.Observable.combineLatest(others.map(other$ => other$.filter(isDone))),
      // emits for the first response with results
      Rx.Observable.merge(...others).filter(hasResults),
    )
  ),
  // would block other providers without pending response at the start
  // (because of `combineLatest` logic in `mixResults`)
  startWith(getPendingResponse(providerId, config)),
);
