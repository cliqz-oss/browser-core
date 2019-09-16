/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
