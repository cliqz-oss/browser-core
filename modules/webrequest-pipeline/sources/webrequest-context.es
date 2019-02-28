import { URLInfo } from '../core/url-info';
import logger from './logger';


const TYPE_LOOKUP = {
  // maps string (web-ext) to int (FF cpt)
  other: 1,
  script: 2,
  image: 3,
  stylesheet: 4,
  object: 5,
  main_frame: 6,
  sub_frame: 7,
  xbl: 9,
  ping: 10,
  xmlhttprequest: 11,
  object_subrequest: 12,
  xml_dtd: 13,
  font: 14,
  media: 15,
  websocket: 16,
  csp_report: 17,
  xslt: 18,
  beacon: 19,
  imageset: 21,
  web_manifest: 22,
};

const TYPE_LOOKUP_REVERSE = Object.keys(TYPE_LOOKUP)
  .reduce((obj, key) => Object.assign(obj, { [TYPE_LOOKUP[key]]: key }), {});


function createHeadersGetter(headers) {
  const headersMap = new Map();

  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i];
    headersMap.set(header.name.toLowerCase(), header.value);
  }

  return headersMap;
}


/**
 * Implements WebRequest Context API
 */
class WebRequestContext {
  constructor(details) {
    // The following are NOT supported in bootstrap extension
    this.requestId = details.requestId;
    this.timeStamp = details.timeStamp;
    this.method = details.method;
    this.ip = details.ip;
    this.error = details.error;
    this.proxyInfo = details.proxyInfo; // FF web-ext only

    // Frame ids: tabId -> parentFrameId -> frameId
    this.frameId = details.frameId;
    this.parentFrameId = details.parentFrameId;
    this.tabId = details.tabId;

    // Urls:  sourceUrl -> originUrl -> url
    this.url = details.url;
    this._urlParts = null;
    this.originUrl = details.originUrl;
    this._originUrlParts = null;
    this.sourceUrl = details.sourceUrl;
    this._sourceUrlParts = null;

    this.trigger = details.trigger || details.originUrl;
    this.documentUrl = details.documentUrl;
    this.frameAncestors = details.frameAncestors;

    // Content type
    // We should still use the interger type (cpt) from LegacyContext
    this.type = details.type;
    if (typeof details.type === 'string') {
      this.typeInt = TYPE_LOOKUP[details.type];
    } else {
      this.typeInt = this.type;
      this.type = TYPE_LOOKUP_REVERSE[details.type];
    }

    // Headers
    this.requestHeaders = details.requestHeaders;
    this._requestHeadersMap = null;
    this.responseHeaders = details.responseHeaders;
    this._responseHeadersMap = null;

    // Extra metadata
    this.isRedirect = details.isRedirect;
    this.statusCode = details.statusCode;
    this.fromCache = details.fromCache;
    this.isPrivate = details.isPrivate || false;
  }

  get urlParts() {
    if (this._urlParts === null) {
      this._urlParts = URLInfo.get(this.url);
    }

    return this._urlParts;
  }

  get originUrlParts() {
    if (this._originUrlParts === null) {
      this._originUrlParts = URLInfo.get(this.originUrl);
    }

    return this._originUrlParts;
  }

  get sourceUrlParts() {
    if (this._sourceUrlParts === null) {
      this._sourceUrlParts = URLInfo.get(this.sourceUrl);
    }

    return this._sourceUrlParts;
  }

  getRequestHeader(name) {
    if (this.requestHeaders) {
      if (this._requestHeadersMap === null) {
        this._requestHeadersMap = createHeadersGetter(this.requestHeaders);
      }

      return this._requestHeadersMap.get(name.toLowerCase());
    }

    return undefined;
  }

  getResponseHeader(name) {
    if (this.responseHeaders) {
      if (this._responseHeadersMap === null) {
        this._responseHeadersMap = createHeadersGetter(this.responseHeaders);
      }

      return this._responseHeadersMap.get(name.toLowerCase());
    }

    return undefined;
  }

  isFullPage() {
    return this.type === 'main_frame';
  }

  getCookieData() {
    return this.getRequestHeader('Cookie');
  }

  getReferrer() {
    return this.getRequestHeader('Referer');
  }

  getWindowDepth() {
    let windowDepth = 0;
    if (this.frameId !== this.tabId) {
      if (this.frameId === this.parentFrameId) {
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


/**
 * Implements Legacy API on top of WebRequestContext
 */
export default class LegacyContext extends WebRequestContext {
  get cpt() {
    return this.typeInt;
  }

  get tabUrl() {
    return this.sourceUrl;
  }

  get responseStatus() {
    return this.statusCode;
  }

  get isCached() {
    return this.fromCache;
  }
}


export function createWebRequestContext(details, pageStore) {
  const context = details;

  // Check if we have a URL
  if (!context.url || context.url === '') {
    logger.error('createWebRequestContext no url', details);
    return null;
  }

  // **Chromium addition**
  // In Chromium, we do not know if the tab is Private from the webrequest
  // object, so we need to get this information from `pageStore`.
  if (context.isPrivate === null || context.isPrivate === undefined) {
    const tabId = context.tabId;
    if (tabId !== -1 && pageStore.tabs[tabId]) {
      context.isPrivate = pageStore.tabs[tabId].isPrivate;
    }
  }

  // **Chromium addition**
  // We do not get the `sourceUrl` in Chrome, so we keep track of the mapping
  // tabId/sourceUrl in `pageStore`.
  if (!context.sourceUrl) {
    if (context.type === 'main_frame') {
      context.sourceUrl = context.url;
    } else if (context.frameAncestors !== undefined && context.frameAncestors.length !== 0) {
      // On Firefox Webextension we have access to the list of all ancestors.
      // The last element of this array is the top level document. We use it as
      // sourceUrl.
      context.sourceUrl = context.frameAncestors[context.frameAncestors.length - 1].url;
    } else if (context.tabId !== -1) {
      // If `frameAncestors` is not available, we fallback to using `pageStore`
      // which keeps a mapping from frames to top-level document URLs (e.g.: on
      // Chrome).
      context.sourceUrl = pageStore.getSourceURL(context);
    }
  }

  // **Chromium addition**
  // Tag redirects
  if (context.isRedirect === null || context.isRedirect === undefined) {
    context.isRedirect = pageStore.isRedirect(context);
  }

  // **Chromium addition**
  if (context.tabId > -1 && context.type === 'main_frame') {
    pageStore.onFullPage(context);
  }

  return new LegacyContext(context);
}
