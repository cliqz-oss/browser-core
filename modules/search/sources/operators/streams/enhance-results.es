import addLogos from '../results/add-logos';
import addDistance from '../results/add-distance';

import Rx from '../../../platform/lib/rxjs';

const { map } = Rx.operators;

const compose = fns => target => fns.reduce((ret, fn) => fn(ret), target);

// TODO: add tests

/**
 * Factory for the `enhanceResults` operator, which adds logo and distance
 * information to results.
 *
 * @function enhanceResults
 */
export default () =>
  map(({
    query,
    responses,
    ...result
  }) => ({
    // TODO: keep spread all?
    ...result,
    query,
    responses: responses.map(response => ({
      // TODO: keep spread all?
      ...response,
      results: compose([
        addLogos,
        addDistance,
      ])(response.results),
    })),
  }));
