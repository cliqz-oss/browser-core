import { combineLatest, merge } from 'rxjs';
import { filter } from 'rxjs/operators';

import { isDone, hasResults } from '../responses/utils';
import waitFor from './wait-for';
/**
 * Operator that surpresses results from the source until the first result
 * from another provider has arrived, or until all other providers are done
 * (if none of them had a result before).
 *
 * @function waitForResultsFrom
 * @param {Observable[]} others - The other results to wait for.
 * @returns {operator} The `waitForResultsFrom` operator.
 */
export default others => waitFor(
  merge(
    // emits as soon as all providers are done
    combineLatest(others.map(other$ => other$.pipe(filter(isDone)))),
    // emits for the first response with results
    merge(...others).pipe(filter(hasResults)),
  )
);
