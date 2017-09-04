const TYPE_LOOKUP = {
  // maps string (web-ext) to int (FF cpt)
  main_frame: 6,
  sub_frame: 7,
  stylesheet: 4,
  script: 2,
  image: 3,
  font: 14,
  object: 12,
  xmlhttprequest: 11,
  ping: 10,
  csp_report: 17,
  media: 15,
  websocket: 16,
  other: 1
};


export default class {

  constructor(requestDetails) {
    this.details = requestDetails;
    this.url = requestDetails.url;
    this.method = requestDetails.method;
    this.channel = {
      responseStatus: requestDetails.responseStatus || requestDetails.statusCode
    };
    this.isCached = requestDetails.isCached;
  }

  getInnerWindowID() {
    return this.details.frameId;
  }

  getOuterWindowID() {
    return this.details.frameId;
  }

  getParentWindowID() {
    return this.details.parentFrameId || this.details.frameId;
  }

  getLoadingDocument() {
    return this.details.originUrl;
  }

  getContentPolicyType() {
    if (typeof this.details.type === 'string') {
      return TYPE_LOOKUP[this.details.type];
    }

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
    return this.details.source;
  }

  getRequestHeader(header) {
    if (this.details.getRequestHeader) {
      return this.details.getRequestHeader(header);
    }

    const headers = this.details.requestHeaders;
    for (let i = 0; i < headers.length; i += 1) {
      if (headers[i].name === header) {
        return headers[i].value;
      }
    }

    return null;
  }

  getResponseHeader(header) {
    if (this.details.getResponseHeader) {
      return this.details.getResponseHeader(header);
    }

    const headers = this.details.responseHeaders;
    for (let i = 0; i < headers.length; i += 1) {
      if (headers[i].name === header || headers[i].name === header.toLowerCase()) {
        return headers[i].value;
      }
    }

    return null;
  }

  getOriginWindowID() {
    return this.details.tabId;
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
