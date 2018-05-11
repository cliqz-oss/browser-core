import networkFiltersOptimizer from '../../core/adblocker-base/optimizer';
import { processRawRequest } from '../../core/adblocker-base/filters-engine';
import { matchNetworkFilter } from '../../core/adblocker-base/filters-matching';
import ReverseIndex from '../../core/adblocker-base/reverse-index';


/**
 * this method will generate the proper structure we need to use when matching
 * later against the patterns. This will build the "tokenizedURL object"
 * @param  {[type]} url [description]
 * @return {Object}     will be the object needed to parse later
 */
export default function tokenizeUrl(url) {
  return url ? processRawRequest({ url, sourceUrl: '', cpt: 2 }) : null;
}


/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 */
class PatternIndex {
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
   * we will check if the request matches the patterns associated.
   * @param  {[type]} url         [description]
   * @return {[type]}            true if it matches / false otherwise
   */
  match(/* request */) {
    throw new Error('should be implemented by the inherited class ');
  }
}

/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 */
export class SimplePatternIndex extends PatternIndex {
  /**
   * we will check if the request matches the patterns associated.
   * @param  {[type]} url         [description]
   * @return {[type]}            true if it matches / false otherwise
   */
  match(request) {
    let matched = false;
    const checkMatch = (pattern) => {
      matched = matchNetworkFilter(pattern, request);

      // returning true we will continue iterating but is not needed anymore
      return !matched;
    };

    this.index.iterMatchingFilters(request.tokens, checkMatch);

    return matched;
  }
}


/**
 * Accelerating data structure for network filters matching for multiple patterns
 * match detection. Makes use of the reverse index structure defined above.
 */
export class MultiPatternIndex extends PatternIndex {
  /**
   * we will check if the request matches the patterns associated.
   * @param  {[type]} url         [description]
   * @return {[type]}             the set of patterns id that matched this url
   */
  match(request) {
    const matchedIDsSet = new Set();
    const checkMatch = (pattern) => {
      const patternGroupID = pattern.groupID;
      // we will add the pattern id if it matches and is new
      if (!matchedIDsSet.has(patternGroupID) && matchNetworkFilter(pattern, request)) {
        matchedIDsSet.add(patternGroupID);
      }
      // in any case we need to continue iterating
      return true;
    };

    this.index.iterMatchingFilters(request.tokens, checkMatch);

    return matchedIDsSet;
  }
}
