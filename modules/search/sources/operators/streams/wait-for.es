import { combineLatest, pipe } from 'rxjs';
import { pluck, first } from 'rxjs/operators';

/**
 * Similar to `skipUntil` but `waitFor` also emits the latest source value as
 * soon as the provided observable emits.
 *
 * @function waitFor
 * @param {Observable} signal$ - The observable to wait for.
 * @returns {operator} The `waitFor` operator.
 */
export default signal$ => pipe(
  obs => combineLatest(obs, signal$.pipe(first())),
  pluck(0),
);

// export default signal$ => combineLatest(signal$, signal$.pipe(first())).pipe
//   pluck(0),
// );
