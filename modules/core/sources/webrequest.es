export { default, VALID_RESPONSE_PROPERTIES } from '../platform/webrequest';


// TODO - should this be in platform instead?
// Firefox and Chrome still have differencies
export const EXTRA_INFO_SPEC = {
  onBeforeRequest: [
    'blocking',
    // 'requestBody',
  ],
  onBeforeSendHeaders: [
    'blocking',
    'requestHeaders',
  ],
  onSendHeaders: [
    'requestHeaders', // Chrome only?
  ],
  onHeadersReceived: [
    'blocking',
    'responseHeaders',
  ],
  onAuthRequired: [
    'blocking',
    'responseHeaders', // Chrome only?
  ],
  onResponseStarted: [
    'responseHeaders', // Chrome only?
  ],
  onBeforeRedirect: [
    'responseHeaders', // Chrome only?
  ],
  onCompleted: [
    'responseHeaders', // Chrome only?
  ],
  onErrorOccurred: [],
};
