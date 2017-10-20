import { utils } from '../../core/cliqz';
import tokenizeUrl from '../pattern-matching/pattern-utils';
/**
 * This class will be a wrapper containing the url information that will calculate
 * the data needed on demand. This way we can use one unique object containing
 * all the url information we need and share it between different operations
 */
export default class UrlData {
  constructor(rawUrl, referrer = null) {
    if ((typeof rawUrl) !== 'string') {
      throw new Error('invalid raw url type');
    }
    this.rawUrl = rawUrl;
    this.referrer = referrer;

    // all the fields we will handle and share
    this.lowercaseUrl = null;
    this.urlDetails = null;
    this.patternsRequest = null;
  }

  hasReferrer() {
    return this.referrer !== null;
  }

  getReferrer() {
    return this.referrer;
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
    if (this.urlDetails === null) {
      this.urlDetails = utils.getDetailsFromUrl(this.rawUrl);
    }
    return this.urlDetails.domain;
  }

  getPatternRequest() {
    if (this.patternsRequest === null) {
      this.patternsRequest = tokenizeUrl(this.rawUrl);
    }
    return this.patternsRequest;
  }

}
