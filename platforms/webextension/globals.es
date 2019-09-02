/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import browser from 'webextension-polyfill';

import window from './globals-window';
import chrome from './globals-chrome';

export {
  chrome,
  window,
  browser
};

export function isContentScriptsSupported() {
  return window !== undefined && typeof window.browser !== 'undefined' && window.browser.contentScripts;
}
