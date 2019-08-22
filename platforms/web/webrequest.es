/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
