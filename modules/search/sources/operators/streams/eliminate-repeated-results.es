import deepEqual from '../../../platform/lib/deep-equal';
import Rx from '../../../platform/lib/rxjs';

const { distinctUntilChanged } = Rx.operators;

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
export default () => distinctUntilChanged((a, b) =>
  !b.query.forceUpdate && deepEqual(shrinkToUrls(a), shrinkToUrls(b)));
