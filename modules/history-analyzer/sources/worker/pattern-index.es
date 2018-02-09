import networkFiltersOptimizer from '../../core/adblocker-base/optimizer';
import { matchNetworkFilter } from '../../core/adblocker-base/filters-matching';
import ReverseIndex from '../../core/adblocker-base/reverse-index';

/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 */
export default class PatternIndex {
  constructor(filters) {
    this.index = new ReverseIndex(
      filters,
      filter => filter.getTokens(),
      { optimizer: networkFiltersOptimizer },
    );
  }

  optimizeAheadOfTime() {
    this.index.optimizeAheadOfTime();
  }

  /**
   * will take the url we want to match and the list of patterns associated to this
   * particular day
   * @param  {[type]} url         [description]
   * @param  {[type]} patternsSet [description]
   * @return {[type]}             the set of patterns id that matched this url
   */
  match(request, patternsSet) {
    // we need to simulate a request object to use directly the same method than
    // adblocker
    const bucketMatchedSet = new Set();
    const checkMatch = (pattern) => {
      /* eslint no-param-reassign: off */

      // check which ids associated to the pattern belongs to the pattern set
      // AND remove all the ids that we already matched here and proceed
      const idsToCheck = [...pattern.id_set].filter(x =>
        (patternsSet.has(x) && !bucketMatchedSet.has(x)));
      if (idsToCheck.length === 0) {
        // nothing to check here, continue to the next
        return true;
      }

      if (matchNetworkFilter(pattern, request)) {
        idsToCheck.forEach(pid => bucketMatchedSet.add(pid));
      }

      return true; // Continue iterating on buckets
    };

    this.index.iterMatchingFilters(request.tokens, checkMatch);

    // whatever here
    return bucketMatchedSet;
  }
}
