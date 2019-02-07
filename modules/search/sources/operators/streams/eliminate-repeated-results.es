import { pipe } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import deepEqual from 'deep-equal';

/**
 * Shrinks a full normalized result into nested lists of urls
 *
 * @param {Object} result - The normalized result.
 */
const shrinkToUrls = ({ responses }) =>
  responses.map(({ results }) =>
    results.map(({ links }) =>
      links.map(({ url, extra = {} }) => url + Object.keys(extra).length)));

/**
 * Factory for the `eliminateRepeatedResults` operator, which eliminates
 * repeated results based on urls
 *
 * @function eliminateRepeatedResults
 */
export default () => pipe(
  distinctUntilChanged((a, b) =>
    !b.query.forceUpdate && deepEqual(shrinkToUrls(a), shrinkToUrls(b)))
);
