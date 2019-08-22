/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import console from './console';

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
      }
      return '{}';
    },

    _trigger(_requestInfo) {
      const requestInfo = _requestInfo;
      // getter for request headers
      requestInfo.getRequestHeader = function getRequestHeader(header) {
        return requestInfo.requestHeaders[header];
      };
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
      }
      return '{}';
    },

    _trigger(_requestInfo) {
      const requestInfo = _requestInfo;
      // getter for request headers
      requestInfo.getRequestHeader = function getRequestHeader(header) {
        return requestInfo.requestHeaders[header];
      };
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

  onHeadersReceived: {
    addListener() {},
    removeListener() {}
  }
};

export default webRequest;

export const VALID_RESPONSE_PROPERTIES = {
  onBeforeRequest: [
    'cancel',
    'redirectUrl',
  ],
  onBeforeSendHeaders: [
    'cancel',
    'requestHeaders',
  ],
};
