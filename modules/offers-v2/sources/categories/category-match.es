import { buildMultiPatternIndex } from '../common/pattern-utils';

/**
 * This class will be used to simplify the handling and matching logic for
 * categories
 */
export default class CategoryMatch {
  constructor() {
    this.multiPatternObj = null;
    // cat id -> patterns data
    this.patterns = new Map();
  }

  addCategoryPatterns(catID, patterns) {
    if (!catID || !patterns) {
      return;
    }
    this.patterns.set(catID, patterns);
  }

  removeCategoryPatterns(catID) {
    this.patterns.delete(catID);
  }

  clear() {
    this.patterns = new Map();
  }

  build() {
    const patternsList = [];
    this.patterns.forEach((patterns, catID) =>
      patternsList.push({ groupID: catID, patterns }));
    this.multiPatternObj = buildMultiPatternIndex(patternsList);
  }

  /**
   * will return a set of categories ids that match the current tokenized url
   */
  checkMatches(tokenizedURL) {
    return this.multiPatternObj
      ? this.multiPatternObj.matchWithPatterns(tokenizedURL)
      : new Set();
  }
}
