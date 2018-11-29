/* global Components WebRequest PrivateBrowsingUtils MatchPattern */
import { isDesktopBrowser } from '../core/platform';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/WebRequest.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/PrivateBrowsingUtils.jsm');

/**
 * Gets the tabId and windowId for a given browser instance
 * Partly based on tabTracker API implementation:
 * https://github.com/mozilla/gecko-dev/blob/473a1509eae87a911b339d20bbd396ef84ae2cbb/browser/components/extensions/ext-utils.js
 * @param  {Browser} browser
 * @return {Object}  with attributes tabId and windowId
 */
function getBrowserData(_browser) {
  let browser = _browser;
  // When we're loaded into a <browser> inside about:addons, we need to go up
  // one more level.
  if (browser.ownerGlobal && browser.ownerGlobal.location.href === 'about:addons') {
    // legacy impl
    browser = browser.ownerGlobal.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDocShell)
      .chromeEventHandler;
  } else if (browser.ownerDocument && browser.ownerDocument.documentURI === 'about:addons') {
    // new impl as of sept 2017
    browser = browser.ownerDocument.docShell.chromeEventHandler;
  }

  const result = {
    tabId: -1,
    windowId: -1,
  };

  if (browser && browser.outerWindowID) {
    result.tabId = browser.outerWindowID;
  }

  return result;
}

/**
 * Generates a listener for data from WebRequest.jsm, which translates these calls
 * for the expected WebRequest API.
 * Based on ext-webRequest.js (https://github.com/mozilla/gecko-dev/blob/master/toolkit/components/extensions/ext-webRequest.js)
 * @param  {Function} listener which this function wrapes
 * @return {Function}          Function to be registered with WebRequest.jsm
 */
function webRequestListenerWrapper(listener, topic) {
  const maybeCached = ['onResponseStarted', 'onBeforeRedirect', 'onCompleted', 'onErrorOccurred'].includes(topic);
  const optional = ['requestHeaders', 'responseHeaders', 'statusCode', 'statusLine', 'error', 'redirectUrl',
    'requestBody', 'scheme', 'realm', 'isProxy', 'challenger', 'ip', 'frameAncestors'];
  return (data) => {
    let isPrivate = true;
    // ignore system principal: OCSP, addon and other background requests
    if (data.isSystemPrincipal) {
      return {};
    }

    // ignore chrome urls
    if (['chrome://', 'resource://', 'data:', 'blob', 'about:'].some(proto => data.url.startsWith(proto))) {
      return {};
    }

    let browserData = { tabId: -1, windowId: -1 };
    if (data.browser) {
      browserData = getBrowserData(data.browser);
      if (data.browser.currentURI) {
        browserData.source = data.browser.currentURI.spec;
      }
      // Because of Forget Tab feature in Cliqz we need access to
      // browser's `loadContext` in order to determine its privacy status.
      // But when tabs gets closed and current requests dropped
      // we may not have `browser.loadContext` anymore.
      if (!isDesktopBrowser || data.browser.loadContext) {
        isPrivate = PrivateBrowsingUtils.isBrowserPrivate(data.browser);
      }
    }
    let parentFrame = data.parentWindowId;
    if (data.type === 'main_frame' || data.windowId === data.parentWindowId) {
      parentFrame = -1;
    } else if (parentFrame === browserData.tabId) {
      parentFrame = 0;
    }

    const data2 = {
      requestId: data.requestId,
      url: data.url,
      originUrl: data.type === 'main_frame' ? undefined : data.originUrl || browserData.source,
      documentUrl: data.documentUrl,
      method: data.method,
      tabId: browserData.tabId || -1,
      type: data.type,
      timeStamp: Date.now(),
      frameId: data.type === 'main_frame' ? 0 : data.windowId,
      parentFrameId: parentFrame,
      // API additions
      isPrivate,
    };
    // For Firefox 58+ we can use frameAncestors to find the source
    if (data.frameAncestors && data.frameAncestors.length > 0) {
      data2.sourceUrl = data.frameAncestors[data.frameAncestors.length - 1].url;
    } else if (!data.frameAncestors && data2.frameId !== data2.parentFrameId && data2.type === 'beacon') {
      // guess when not to use the tab source as sourceUrl
      data2.sourceUrl = data.originUrl;
    } else if (!data.frameAncestors
        && (data.windowId === data.parentWindowId || data.parentWindowId === -1)
        && data.originUrl !== browserData.source) {
      data2.sourceUrl = data.originUrl;
    } else {
      data2.sourceUrl = browserData.source;
    }

    if (maybeCached) {
      data2.fromCache = !!data.fromCache;
    }

    for (const opt of optional) {
      if (opt in data) {
        data2[opt] = data[opt];
      }
    }

    return listener(data2);
  };
}

function webRequestLegacyWrapper(listener) {
  return (prevData) => {
    const data = prevData;
    // originUrl === triggeringPrincipal
    // https://github.com/mozilla/gecko-dev/blob/master/toolkit/modules/addons/WebRequest.jsm#L748
    data.trigger = data.originUrl;

    // TODO: This comes on a later topic than we listen at the moment
    data.isCached = data.fromCache;

    data.responseStatus = data.statusCode;

    return listener(data);
  };
}

class WebRequestWrapper {
  constructor(topic) {
    this.topic = topic;
    this.listeners = {};
  }

  addListener(listener, filter, extraInfo) {
    const wrFilter = filter ? {
      types: filter.types,
    } : undefined;
    if (filter && filter.urls && filter.urls.length > 0 && !filter.urls[0] === '<all_urls>') {
      wrFilter.urls = new MatchPattern(filter.urls);
    }
    this.listeners[listener] = webRequestListenerWrapper(
      webRequestLegacyWrapper(listener),
      this.topic
    );
    WebRequest[this.topic].addListener(this.listeners[listener], wrFilter, extraInfo);
  }

  removeListener(listener) {
    WebRequest[this.topic].removeListener(this.listeners[listener]);
    delete this.listeners[listener];
  }
}

export default {
  onBeforeRequest: new WebRequestWrapper('onBeforeRequest'),
  onBeforeSendHeaders: new WebRequestWrapper('onBeforeSendHeaders'),
  onSendHeaders: new WebRequestWrapper('onSendHeaders'),
  onHeadersReceived: new WebRequestWrapper('onHeadersReceived'),
  onAuthRequired: new WebRequestWrapper('onAuthRequired'),
  onBeforeRedirect: new WebRequestWrapper('onBeforeRedirect'),
  onResponseStarted: new WebRequestWrapper('onResponseStarted'),
  onErrorOccurred: new WebRequestWrapper('onErrorOccurred'),
  onCompleted: new WebRequestWrapper('onCompleted'),
};

export const VALID_RESPONSE_PROPERTIES = {
  onBeforeRequest: [
    'cancel',
    'redirectUrl',
  ],
  onBeforeSendHeaders: [
    'cancel',
    'requestHeaders',
  ],
  onSendHeaders: [
  ],
  onHeadersReceived: [
    'redirectUrl',
    'responseHeaders',
  ],
  onAuthRequired: [
    'cancel',
  ],
  onResponseStarted: [
  ],
  onBeforeRedirect: [
  ],
  onCompleted: [
  ],
  onErrorOccurred: [
  ],
};
