
export default class {

  constructor(requestDetails) {
    this.details = requestDetails;
    this.url = requestDetails.url;
    this.method = requestDetails.method;
    this.channel = {
      responseStatus: requestDetails.responseStatus
    };
    this.isCached = requestDetails.isCached;
  }

  getInnerWindowID() {
    return this.details.frameId;
  }

  getOuterWindowID() {
    return this.details.getOuterWindowID();
  }

  getParentWindowID() {
    return this.details.parentFrameId || this.getOuterWindowID();
  }

  getLoadingDocument() {
    return this.details.originUrl;
  }

  getContentPolicyType() {
    return this.details.type;
  }

  isFullPage() {
    return this.getContentPolicyType() === 6;
  }

  getCookieData() {
    return this.getRequestHeader('Cookie');
  }

  getReferrer() {
    return this.getRequestHeader('Referer');
  }

  getSourceURL() {
    return this.details.getSourceURL();
  }

  getRequestHeader(header) {
    return this.details.getRequestHeader(header);
  }

  getResponseHeader(header) {
    return this.details.getResponseHeader(header);
  }

  getOriginWindowID() {
    return this.details.getOriginWindowID();
  }

  isChannelPrivate() {
    return this.details.isPrivate;
  }

  getPostData() {
    return this.details.getPostData();
  }

  getWindowDepth() {
    let windowDepth = 0;
    if (this.getInnerWindowID() !== this.getOriginWindowID()) {
      if (this.getOriginWindowID() === this.getParentWindowID()) {
        // frame in document
        windowDepth = 1;
      } else {
        // deeper than 1st level iframe
        windowDepth = 2;
      }
    }
    return windowDepth;
  }
}
