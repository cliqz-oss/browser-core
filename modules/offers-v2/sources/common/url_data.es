/**
 * @module offers-v2
 */
import { parse, getCleanHost } from '../../core/url';
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
  constructor(rawUrl, referrerName = null, tabId = null) {
    if ((typeof rawUrl) !== 'string') {
      throw new Error(`invalid raw url type: ${typeof rawUrl}`);
    }
    this.rawUrl = rawUrl;
    this.referrerName = referrerName;
    this.tabId = tabId;

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

  getTabId() { return this.tabId; }

  getRawUrl() {
    return this.rawUrl;
  }

  static _getNormalizedUrl(url) {
    try {
      return decodeURIComponent(url.replace(/\+/g, '%20')).toLowerCase();
    } catch (err) {
      return url.toLowerCase();
    }
  }

  getNormalizedUrl() {
    if (this.normalizedUrl === null) {
      this.normalizedUrl = UrlData._getNormalizedUrl(this.rawUrl);
    }
    return this.normalizedUrl;
  }

  getUrlDetails() {
    if (this.urlDetails === null) {
      const url = parse(this.rawUrl);
      this.urlDetails = {
        cleanHost: getCleanHost(url),
        query: (url !== null && url.search) ? url.search.slice(1) : '',
        path: url !== null ? url.pathname : '',
      };
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
  getPatternRequest(cpt = 'script') {
    if (this.patternsRequest === null) {
      let url = this.rawUrl;
      url = UrlData._rewriteGoogleSerpUrl(url);
      url = UrlData._getNormalizedUrl(url);
      this.patternsRequest = tokenizeUrl(url, cpt);
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

  // rewrite google serp url to avoid that blacklisting reacts on
  // google tracking with words like "firefox" and "ubuntu"
  static _rewriteGoogleSerpUrl(url) {
    const fu = parse(url);
    if (fu === null) {
      return url;
    }

    const domain = fu.generalDomain;
    if (!(domain && domain.startsWith('google.'))) {
      return url;
    }
    if (fu.pathname !== '/search') {
      return url;
    }
    const searchParams = new Map(fu.searchParams.params);
    const query = searchParams.get('q') || searchParams.get('query');
    if (!query) {
      return url;
    }
    const prefix = url.substr(0, url.indexOf('?'));
    return `${prefix}?q=${query}`;
  }
}
