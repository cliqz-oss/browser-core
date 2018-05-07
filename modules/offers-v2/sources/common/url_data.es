import utils from '../../core/utils';
import tokenizeUrl from './pattern-utils';
import { getGeneralDomain } from '../../core/tlds';

/**
 * This class will be a wrapper containing the url information that will calculate
 * the data needed on demand. This way we can use one unique object containing
 * all the url information we need and share it between different operations
 */
export default class UrlData {
  constructor(rawUrl, referrerName = null) {
    if ((typeof rawUrl) !== 'string') {
      throw new Error('invalid raw url type');
    }
    this.rawUrl = rawUrl;
    this.referrerName = referrerName;

    // all the fields we will handle and share
    this.lowercaseUrl = null;
    this.urlDetails = null;
    this.domain = null;
    this.patternsRequest = null;
    // active categories to be shared on this url data
    this.activatedCategoriesIDs = new Set();
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

  getLowercaseUrl() {
    if (this.lowercaseUrl === null) {
      this.lowercaseUrl = this.rawUrl.toLowerCase();
    }
    return this.lowercaseUrl;
  }

  getUrlDetails() {
    if (this.urlDetails === null) {
      this.urlDetails = utils.getDetailsFromUrl(this.rawUrl);
    }
    return this.urlDetails;
  }

  getDomain() {
    if (this.domain === null) {
      this.domain = getGeneralDomain(this.rawUrl);
    }
    return this.domain;
  }

  getPatternRequest() {
    if (this.patternsRequest === null) {
      this.patternsRequest = tokenizeUrl(this.getLowercaseUrl());
    }
    return this.patternsRequest;
  }

  setActivatedCategoriesIDs(catIDsSet) {
    this.activatedCategoriesIDs = catIDsSet;
  }

  getActivatedCategoriesIDs() {
    return this.activatedCategoriesIDs;
  }
}
