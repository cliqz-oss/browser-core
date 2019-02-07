import { chrome } from './globals';


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
    'cancel',
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


export default chrome.webRequest || {};
