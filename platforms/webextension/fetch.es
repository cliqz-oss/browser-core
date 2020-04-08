/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import window from './globals-window';
import chrome from './globals-chrome';

const {
  fetch,
  Headers,
  Request,
  Response,
  AbortController,
} = window;

/**
 * Note: On Chrome, chrome.runtime.id is the same, but
 * on Firefox, they distinguish between the extension ID
 * (e.g., "firefox@ghostery.com") and the internal UUID
 * (e.g., "0b3696ed-9250-44a9-93d3-0c43caea7b3b").
 *
 * On Firefox, the UUID is by user. That means different users
 * of the same extension will have different (but fixed) UUIDs.
 */
function getExtensionUuid() {
  try {
    const id = chrome.i18n.getMessage('@@extension_id');
    if (id) {
      return id;
    }
  } catch (e) {
    // fallback
  }

  return chrome.runtime.id;
}
const extensionUuid = getExtensionUuid();

const blacklistedOriginHeaders = [
  `moz-extension://${extensionUuid}`,
  `chrome-extension://${extensionUuid}`,
];

/**
 * Detects origin headers automatically added by the browser.
 * We have to detect them, so we can later remove them using the
 * webrequestAPI (see webrequest-pipeline/fetch-sanitizer.es).
 *
 * Warning: We have to be sure only to detect requests made from our
 * extension. Otherwise, we break other extensions that are relying on
 * the origin header.
 */
function isTrackableOriginHeaderFromOurExtension(value) {
  return blacklistedOriginHeaders.some(x => value === x);
}

export {
  fetch as default,
  fetch as fetchArrayBuffer,
  fetch,
  Headers,
  Request,
  Response,
  AbortController,
  isTrackableOriginHeaderFromOurExtension
};
