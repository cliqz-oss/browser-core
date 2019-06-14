import { URLInfo } from '../core/url-info';
import logger from './logger';


/**
 * Transform an array of headers (i.e.: `{ name, value }`) into a `Map`.
 */
function createHeadersGetter(headers) {
  const headersMap = new Map();

  for (let i = 0; i < headers.length; i += 1) {
    const { name, value } = headers[i];
    headersMap.set(name.toLowerCase(), value);
  }

  return headersMap;
}


/**
 * Wrap webRequest's details to provide convenient helpers.
 */
export default class WebRequestContext {
  /**
  * "Smart" constructor for `WebRequestContext`. It will make sure that the same
  * information is provided for different browsers (e.g.: Chrome and Firefox) as
  * well as provide convenient helpers for parsed URLs, etc. It will also not
  * return a wrapper for background requests.
  */
  static fromDetails(details, pageStore, event) {
    const context = details;

    // Check if we have a URL
    if (!context.url) {
      logger.log('Ignoring request with empty url', context);
      return null;
    }

    // Main frames book keeping
    if (context.type === 'main_frame') {
      pageStore.onMainFrame(context, event);
    }

    // Sub frames book keeping
    if (context.type === 'sub_frame') {
      pageStore.onSubFrame(context);
    }

    // **Chromium addition**
    // frameAncestors
    if (context.frameAncestors === undefined) {
      context.frameAncestors = pageStore.getFrameAncestors(context);
    }

    // Cliqz-specific extensions to webRequest details
    context.tabUrl = context.tabUrl || pageStore.getTabUrl(context);
    context.frameUrl = context.frameUrl || pageStore.getFrameUrl(context);
    context.isRedirect = pageStore.isRedirect(context);
    context.isPrivate = pageStore.isPrivateTab(context.tabId);
    context.isMainFrame = context.type === 'main_frame';

    context.originUrl = context.originUrl || context.initiator || context.frameUrl
      || context.tabUrl;

    return new WebRequestContext(context);
  }

  constructor(details) {
    Object.assign(this, details);

    // Lazy attributes
    this._frameUrlParts = null;

    this._requestHeadersMap = null;
    this._responseHeadersMap = null;

    this.urlParts = URLInfo.get(this.url);
    this.frameUrlParts = URLInfo.get(this.frameUrl);
    this.tabUrlParts = URLInfo.get(this.tabUrl);
    this.originUrlParts = URLInfo.get(this.originUrl);
  }

  getRequestHeader(name) {
    if (this._requestHeadersMap === null) {
      this._requestHeadersMap = createHeadersGetter(this.requestHeaders || []);
    }

    return this._requestHeadersMap.get(name.toLowerCase());
  }

  getResponseHeader(name) {
    if (this._responseHeadersMap === null) {
      this._responseHeadersMap = createHeadersGetter(this.responseHeaders || []);
    }

    return this._responseHeadersMap.get(name.toLowerCase());
  }

  getCookieData() {
    return this.getRequestHeader('Cookie');
  }

  getReferrer() {
    return this.getRequestHeader('Referer');
  }

  isBackgroundRequest() {
    return this.tabId === -1;
  }
}
