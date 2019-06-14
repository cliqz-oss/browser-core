import PatternMatching from '../../platform/lib/adblocker';


/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 * @param {[PatternMatching.NetworkFilter]} filters
 * @param {Map<string, string>>} id2patterns
 * @param {Map<string, string>>} id2categories
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

  isEmpty() {
    return this.id2pattern.size === 0;
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
 * @class MultiIndexMatchDetails
 * - rawPattern: the original string pattern
 * - tokenCount: number of tokens inside the pattern
 */

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
   * @returns {Map<string, MultiIndexMatchDetails[]>}
   */
  match(request) {
    return new Set(this.matchWithPatterns(request).keys());
  }

  matchWithPatterns(request) {
    const matchedIDs = new Map();

    this.index.iterMatchingFilters(request.getTokens(), (pattern) => {
      if (pattern.match(request)) {
        this.id2categories.get(pattern.getId()).forEach((groupID) => {
          const matchDetails = {
            rawPattern: this.id2pattern.get(pattern.getId()),
            tokenCount: pattern.getTokens()[0].length,
          };
          if (matchedIDs.has(groupID)) {
            matchedIDs.get(groupID).push(matchDetails);
          } else {
            matchedIDs.set(groupID, [matchDetails]);
          }
        });
      }
      // in any case we need to continue iterating
      return true;
    });

    return matchedIDs;
  }
}
