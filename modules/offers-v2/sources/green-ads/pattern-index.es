import PatternMatching from '../../platform/lib/adblocker';

export default class PatternIndex {
  constructor(filters = []) {
    this.index = new PatternMatching.ReverseIndex({
      filters,
      deserialize: PatternMatching.NetworkFilter.deserialize,
    });

    // Stores a set of all tokens used as keys in the index
    this.tokens = PatternMatching.compactTokens(this.index.getTokens());
  }

  match(request) {
    const matches = [];

    const checkMatch = (filter) => {
      if (filter.match(request)) {
        matches.push(filter);
      }

      return true; // Continue iterating on buckets
    };

    this.index.iterMatchingFilters(request.getTokens(), checkMatch);

    return matches;
  }
}
