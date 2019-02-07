import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

// TODO: add tests

/**
 * Factory for the `mergeResults` operator, which merges multiple responses
 * (from different providers) into a single response.
 *
 * @function mergeResults
 */
export default () => pipe(map(({ query, responses }) => {
  if (!query.query && !query.allowEmptyQuery) {
    // TODO: create (shared) result constructor?
    return {
      query,
      responses: [
        {
          results: [],
        },
      ]
    };
  }
  return { query, responses };
}));
