import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

// TODO: add tests

/**
 * Factory for the `pluckResults` operator, which extacts the actual results
 * array from the surrounding result data structure.
 *
 * @function pluckResults
 */
export default () =>
  pipe(map(({ responses: [first] }) => (first && first.results) || []));
