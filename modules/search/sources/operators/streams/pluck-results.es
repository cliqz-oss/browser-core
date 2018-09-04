import Rx from '../../../platform/lib/rxjs';

const { map } = Rx.operators;

// TODO: add tests

/**
 * Factory for the `pluckResults` operator, which extacts the actual results
 * array from the surrounding result data structure.
 *
 * @function pluckResults
 */
export default () =>
  map(({ responses: [first] }) => (first && first.results) || []);
