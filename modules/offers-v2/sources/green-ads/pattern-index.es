import PatternMatching from '../../platform/lib/adblocker';

export default class PatternIndex {
  constructor(filters = []) {
    this.index = new PatternMatching.ReverseIndex(cb => filters.forEach(cb));

    // Stores a set of all tokens used as keys in the index
    this.tokens = PatternMatching.compactTokens(new Uint32Array(this.index.index.keys()));
  }

  match(request) {
    const matches = [];

    const checkMatch = (filter) => {
      if (PatternMatching.matchNetworkFilter(filter, request)) {
        matches.push(filter);
      }

      return true; // Continue iterating on buckets
    };

    this.index.iterMatchingFilters(request.getTokens(), checkMatch);

    return matches;
  }
}
