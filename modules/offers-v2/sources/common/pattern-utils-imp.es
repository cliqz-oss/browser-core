import PatternMatching from '../../platform/lib/adblocker';


/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 */
class PatternIndex {
  constructor(filters, id2pattern, id2categories = new Map()) {
    // Keep track of original pattern for each filter
    this.id2pattern = id2pattern;

    // Keep track of categories for each filter
    this.id2categories = id2categories;

    this.index = new PatternMatching.ReverseIndex({
      filters,
      deserialize: PatternMatching.NetworkFilter.deserialize,
    });
    this.tokens = PatternMatching.compactTokens(this.index.getTokens());
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
    this.index.iterMatchingFilters(request.getTokens(), (pattern) => {
      matched = pattern.match(request);

      // returning true we will continue iterating but is not needed anymore
      return !matched;
    });

    return matched;
  }
}

/**
 * Accelerating data structure for network filters matching for multiple patterns
 * match detection. Makes use of the reverse index structure defined above.
 *
 * @class MultiPatternIndex
 */
export class MultiPatternIndex extends PatternIndex {
  /**
   * @method match
   * @param {PatternMatchRequest} request
   * @returns {Map<string, PatternString[]>}
   */
  match(request) {
    return new Set(this.matchWithPatterns(request).keys());
  }

  matchWithPatterns(request) {
    const matchedIDs = new Map();

    this.index.iterMatchingFilters(request.getTokens(), (pattern) => {
      if (pattern.match(request)) {
        this.id2categories.get(pattern.getId()).forEach((groupID) => {
          const rawPattern = this.id2pattern.get(pattern.getId());
          if (matchedIDs.has(groupID)) {
            matchedIDs.get(groupID).push(rawPattern);
          } else {
            matchedIDs.set(groupID, [rawPattern]);
          }
        });
      }
      // in any case we need to continue iterating
      return true;
    });

    return matchedIDs;
  }
}
