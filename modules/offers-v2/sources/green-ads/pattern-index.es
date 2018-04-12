import {
  ReverseIndex,
  compactTokens,
  matchNetworkFilter,
  tokenize
} from '../../core/pattern-matching';


export default class PatternIndex {
  constructor(filters = []) {
    this.index = new ReverseIndex(
      filters,
      filter => tokenize(filter.filter).concat(tokenize(filter.hostname)),
    );

    // Stores a set of all tokens used as keys in the index
    this.tokens = compactTokens(new Uint32Array([...this.index.index.keys()]));
  }

  match(request) {
    const matches = [];

    const checkMatch = (filter) => {
      if (matchNetworkFilter(filter, request)) {
        matches.push(filter);
      }

      return true; // Continue iterating on buckets
    };

    this.index.iterMatchingFilters(tokenize(request.url), checkMatch);

    return matches;
  }
}
