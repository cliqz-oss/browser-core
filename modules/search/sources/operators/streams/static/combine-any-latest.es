import Rx from '../../../../platform/lib/rxjs';

const EMPTY = Symbol('EMPTY');

/**
 * Like `combineLatest`, but emits as soon as one of the observables
 * has emitted (i.e., does not wait until all observables have emitted).
 * Therefore, the emitted Array varies in length.
 *
 * @function combineAnyLatest
 * @param {Observable[]} observables - The observables to combine.
 * @returns {operator} The `combineAnyLatest` static operator.
 */

export default observables =>
  Rx.Observable.combineLatest(
    observables.map(observable$ => observable$.startWith(EMPTY))
  )
    .map(values => values.filter(value => value !== EMPTY))
    .filter(combined => combined.length > 0);
