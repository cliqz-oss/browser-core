/**
 * @module offers-v2
 */
import { getDetailsFromUrl } from '../../core/url';
import tokenizeUrl from './pattern-utils';
import { getGeneralDomain } from '../../core/tlds';

/**
 * This class will be a wrapper containing the url information that will calculate
 * the data needed on demand. This way we can use one unique object containing
 * all the url information we need and share it between different operations
 *
 * @class UrlData
 */
export default class UrlData {
  constructor(rawUrl, referrerName = null) {
    if ((typeof rawUrl) !== 'string') {
      throw new Error(`invalid raw url type: ${typeof rawUrl}`);
    }
    this.rawUrl = rawUrl;
    this.referrerName = referrerName;

    // all the fields we will handle and share
    this.normalizedUrl = null;
    this.urlDetails = null;
    this.domain = null;
    this.patternsRequest = null;
    this.categoriesMatches = null;
  }

  hasReferrerName() {
    return this.referrerName !== null;
  }

  getReferrerName() {
    return this.referrerName;
  }

  getRawUrl() {
    return this.rawUrl;
  }

  getNormalizedUrl() {
    if (this.normalizedUrl === null) {
      try {
        this.normalizedUrl = decodeURIComponent(this.rawUrl.replace(/\+/g, '%20')).toLowerCase();
      } catch (err) {
        this.normalizedUrl = this.rawUrl.toLowerCase();
      }
    }
    return this.normalizedUrl;
  }

  getUrlDetails() {
    if (this.urlDetails === null) {
      this.urlDetails = getDetailsFromUrl(this.rawUrl);
    }
    return this.urlDetails;
  }

  getDomain() {
    if (this.domain === null) {
      this.domain = getGeneralDomain(this.rawUrl);
    }
    return this.domain;
  }

  getGeneralDomain() {
    return this.getDomain();
  }

  /**
   * @method getPatternRequest
   * @returns {PatternMatchRequest}
   */
  getPatternRequest(cpt = 2) {
    if (this.patternsRequest === null) {
      this.patternsRequest = tokenizeUrl(this.getNormalizedUrl(), cpt);
    }
    return this.patternsRequest;
  }

  /**
   * @method setCategoriesMatchTraits
   * @param {CategoriesMatchTraits} matches
   */
  setCategoriesMatchTraits(matches) {
    this.categoriesMatches = matches;
  }

  /**
   * @method getCategoriesMatchTraits
   * @returns {CategoriesMatchTraits}
   */
  getCategoriesMatchTraits() {
    return this.categoriesMatches;
  }
}
