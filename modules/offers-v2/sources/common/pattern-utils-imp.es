import PatternMatching from '../../platform/lib/adblocker';


/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 */
class PatternIndex {
  constructor(filters) {
    this.index = new PatternMatching.ReverseIndex(cb => filters.forEach(cb));
    this.tokens = PatternMatching.compactTokens(new Uint32Array(this.index.index.keys()));
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
      matched = PatternMatching.matchNetworkFilter(pattern, request);

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
   * @returns {Map<string, PatternString>}
   */
  match(request) {
    return new Set(this.matchWithPatterns(request).keys());
  }

  matchWithPatterns(request) {
    const matchedIDs = new Map();

    this.index.iterMatchingFilters(request.getTokens(), (pattern) => {
      if (PatternMatching.matchNetworkFilter(pattern, request)) {
        const patternGroupID = (pattern.groupID instanceof Array)
          ? pattern.groupID
          : [pattern.groupID];

        patternGroupID.forEach((groupID) => {
          // we will add the pattern id if it matches and is new
          if (!matchedIDs.has(groupID)) {
            matchedIDs.set(groupID, pattern.rawLine);
          }
        });
      }
      // in any case we need to continue iterating
      return true;
    });

    return matchedIDs;
  }
}
