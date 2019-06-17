import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

// TODO: add tests

const flatten = (key, responses) =>
  [].concat(...responses.map(response => response[key] || []));

/**
 * Factory for the `mergeResults` operator, which merges multiple responses
 * (from different providers) into a single response.
 *
 * @function mergeResults
 */
export default () => pipe(map(({ responses, ...result }) => ({
  ...result,
  // TODO: always return a response even if it does not contain any results?
  responses: [{
    suggestions: flatten('suggestions', responses),
    results: flatten('results', responses),
  }],
})));
