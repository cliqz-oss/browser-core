class WebRequestWrapper {
  addListener(/* listener, filter, extraInfo */) {
  }

  removeListener(/* listener */) {
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
