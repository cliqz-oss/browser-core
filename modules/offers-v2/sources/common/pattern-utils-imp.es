import { ReverseIndex, matchNetworkFilter, compactTokens } from '../../core/pattern-matching';


/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 */
class PatternIndex {
  constructor(filters) {
    this.index = new ReverseIndex(
      filters,
      filter => filter.getTokens(),
    );

    this.tokens = compactTokens(new Uint32Array([...this.index.index.keys()]));
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

