import { buildMultiPatternIndex } from '../common/pattern-utils';

/**
 * Store how categories where matched. Hide technical implementation
 * from the later users (trigger machine, offer prioritization).
 *
 * Categories might be matched inexact or partial (both words are used
 * interchangable). A trial category "common.more.detailed" partially
 * matches against category "common" (without ".more.detailed").
 *
 * @class CategoriesMatchTraits
 */
export class CategoriesMatchTraits {
  /**
   * @constructor
   * @param {Map<string, MultiIndexMatchDetails[]>} matches
   *   Matched category ID to the pattern that caused the match
   */
  constructor(matches) {
    this.matches = matches || new Map();
  }

  /**
   * @method getCategoriesIDs
   * @returns {IterableIterator<string>}
   */
  getCategoriesIDs() {
    return this.matches.keys();
  }

  /**
   * For each (maybe partially) matched trial category,
   * return a pattern how it was matched.
   *
   * @method getMatchPatterns
   * @private // friend of `OfferMatchTraits`
   * @param {IterableIterator<string>} trialCategories
   * @returns {IterableIterator<string>}
   */
  * getMatchPatterns(trialCategories) {
    for (const [, , activeCat] of this.weightsIter(trialCategories)) {
      const patterns = this.matches.get(activeCat);
      for (const pattern of patterns) {
        yield pattern.rawPattern;
      }
    }
  }

  /**
   * For each trialCategory, decide how good it fits to the matches.
   * Special cases:
   * - If a trial category is unknown, it is excluded from the result
   * - A trial directory "common.more.detailed" fits to the matched
   *   directory "common" (without ".more.detailed").
   *
   * @method weights
   * @param {IterableIterator<string>} trialCategories
   * @returns {Map<string, number>}
   */
  weights(trialCategories) {
    const ws = new Map();
    for (const [cat, weight] of this.weightsIter(trialCategories)) {
      const oldWeight = ws.get(cat) || 0;
      ws.set(cat, oldWeight + weight);
    }
    return ws;
  }

  * weightsIter(trialCategories) {
    if (!trialCategories) {
      return;
    }
    for (const [activeCat, patterns] of this.matches.entries()) {
      for (const pattern of patterns) {
        for (const trialCat of trialCategories) {
          const score = CategoriesMatchTraits._scoreCatMatch(
            activeCat, pattern, trialCat
          );
          if (score) {
            yield [trialCat, score, activeCat];
          }
        }
      }
    }
  }

  /**
   * Check if some trialCategory was (maybe partially) matched.
   *
   * @method haveCommonWith
   * @param {IterableIterator<string>} trialCategories
   * @returns {boolean}
   */
  haveCommonWith(trialCategories) {
    const iter = this.weightsIter(trialCategories);
    return !iter.next().done;
  }

  /**
   * - If no match, return zero.
   * - Partial match scores less than complete match.
   *
   * @method _scoreCatMatch
   * @param {string} activeCat
   * @param {MultiIndexMatchDetails} pattern
   * @param {string} trialCat
   * @returns {number}
   * @private
   */
  static _scoreCatMatch(activeCat, pattern, trialCat) {
    if (!trialCat.startsWith(activeCat)) {
      return 0;
    }
    const rawPattern = pattern.rawPattern || '';
    let tokenCount = Math.min(pattern.tokenCount || 0, 10);
    if ((rawPattern[0] === '|') && (rawPattern[1] === '|')) {
      tokenCount -= 1; // do not count .com/.de/etc
    }
    tokenCount = Math.max(tokenCount, 0);
    const score = Math.E ** tokenCount;
    return (activeCat.length === trialCat.length) ? score : score / 2;
  }
}

/**
 * Store how an offer was matched.
 *
 * @class OfferMatchTraits
 */
export class OfferMatchTraits {
  /**
   * The both input values can be null.
   *
   * @constructor
   * @param {CategoriesMatchTraits} catMatches
   * @param {IterableIterator<string>} offerCategories
   */
  constructor(catMatches, offerCategories, domainHash) {
    // After introduction of `addReason`, we could refactor `this.reason`
    // to be a `Set`. However, as this object is used in the persistent
    // storage, then we would have to support loading of an old version.
    this.reason = [];
    if (!catMatches || !offerCategories) {
      return;
    }
    for (const pattern of catMatches.getMatchPatterns(offerCategories)) {
      this.addReason({ pattern, domainHash });
    }
  }

  /**
   * Create an object from JSON representation. Both share the same
   * internal object.
   * @param {Object} reasonJson, null is ok
   * @returns {OfferMatchTraits}
   */
  static fromStorage(reasonJson) {
    const obj = new OfferMatchTraits(null, null, '');
    const reason = (reasonJson && reasonJson.reason) || [];
    obj.reason = reason.map(OfferMatchTraits._transform);
    return obj;
  }

  static _transform(pattern) {
    return (typeof pattern === 'string') ? { pattern } : pattern;
  }

  /**
   * @method getReason
   * @returns {string[]}
   */
  getReason() {
    return this.reason;
  }

  /**
   * @method addReason
   * @param newReason
   */
  addReason({ pattern, domainHash }) {
    const patterns = this.reason.map(r => r.pattern);
    if (!patterns.includes(pattern)) {
      this.reason.push({ pattern, domainHash });
    }
  }

  /**
   * Represent the object as JSON. Both share the same internal object.
   *
   * @returns {Object}
   */
  toStorage() {
    return { reason: this.reason };
  }
}

/**
 * This class will be used to simplify the handling and matching logic for
 * categories
 *
 * @class CategoryMatch
 */
export class CategoryMatch {
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
   *
   * @method checkMatches
   * @param {PatternMatchRequest} tokenizedURL
   * @returns {CategoriesMatchTraits}
   */
  checkMatches(tokenizedURL) {
    const matchMap = this.multiPatternObj
      ? this.multiPatternObj.matchWithPatterns(tokenizedURL)
      : new Map();
    return new CategoriesMatchTraits(matchMap);
  }
}
