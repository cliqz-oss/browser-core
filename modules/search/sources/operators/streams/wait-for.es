import Rx from '../../../platform/lib/rxjs';

const { combineLatest, pluck } = Rx.operators;

/**
 * Similar to `skipUntil` but `waitFor` also emits the latest source value as
 * soon as the provided observable emits.
 *
 * @function waitFor
 * @param {Observable} signal$ - The observable to wait for.
 * @returns {operator} The `waitFor` operator.
 */
export default signal$ => Rx.pipe(
  combineLatest(signal$.first()),
  pluck(0),
);
