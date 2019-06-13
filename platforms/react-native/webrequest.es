// import utils from "../core/utils";
/* eslint no-param-reassign: off */

import console from './console';

const CPT_TO_TYPE = {
  1: 'other',
  2: 'script',
  3: 'image',
  4: 'stylesheet',
  6: 'main_frame',
  7: 'sub_frame',
  11: 'xhr',
  14: 'font',
};

const webRequest = {
  onBeforeRequest: {
    listeners: [],
    addListener(listener, filter, extraInfo) {
      this.listeners.push({ fn: listener, filter, extraInfo });
    },
    removeListener(listener) {
      const ind = this.listeners.findIndex(l => l.fn === listener);
      if (ind > -1) {
        this.listeners.splice(ind, 1);
      }
    },

    _triggerJson(requestInfoJson) {
      const requestInfo = JSON.parse(requestInfoJson);
      try {
        const response = webRequest.onBeforeRequest._trigger(requestInfo) || {};
        return JSON.stringify(response);
      } catch (e) {
        console.error('webrequest trigger error', e);
        return null;
      }
    },

    _trigger(requestInfo) {
      // getter for request headers
      requestInfo.getRequestHeader = header => requestInfo.requestHeaders[header];
      requestInfo.cpt = requestInfo.type;
      requestInfo.type = CPT_TO_TYPE[requestInfo.cpt];
      const blockingResponse = this.listeners.map((listener) => {
        const { fn, extraInfo } = listener;
        if (extraInfo.indexOf('blocking') === -1) {
          // non blocking listener, run async
          setTimeout(fn.bind(undefined, requestInfo), 0);
          return {};
        }
        return fn(requestInfo);
      }).reduce((acc, val) => {
        Object.keys(val).forEach((k) => {
          acc[k] = val[k];
        });
        return acc;
      }, {});
      return blockingResponse;
    }
  },

  onBeforeSendHeaders: {
    addListener() {},
    removeListener() {}
  },

  onHeadersReceived: {
    addListener() {},
    removeListener() {}
  },

  onCompleted: {
    addListener() {},
    removeListener() {}
  },

  onErrorOccurred: {
    addListener() {},
    removeListener() {}
  },

  OnBeforeRequestOptions: {
    BLOCKING: 'blocking',
    REQUEST_HEADERS: 'requestHeaders',
  },
};


// extra response property to indicate that the ghostery counter should be increase
// TODO - is 'shouldIncrementCounter' allowed for all events?
export const VALID_RESPONSE_PROPERTIES = {
  onBeforeRequest: [
    'cancel',
    'redirectUrl',
    'shouldIncrementCounter',
  ],
  onBeforeSendHeaders: [
    'cancel',
    'requestHeaders',
    'shouldIncrementCounter',
  ],
  onSendHeaders: [
    'shouldIncrementCounter',
  ],
  onHeadersReceived: [
    'redirectUrl',
    'responseHeaders',
    'shouldIncrementCounter',
  ],
  onAuthRequired: [
    'cancel',
    'shouldIncrementCounter',
  ],
  onResponseStarted: [
    'shouldIncrementCounter',
  ],
  onBeforeRedirect: [
    'shouldIncrementCounter',
  ],
  onCompleted: [
    'shouldIncrementCounter',
  ],
  onErrorOccurred: [
  ],
};


export default webRequest;
