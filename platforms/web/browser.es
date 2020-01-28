/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { window } from './globals';

export function forEachWindow(cb) {
  cb(window);
}

export function addWindowObserver() {
}

export function removeWindowObserver() {
}

export function addMigrationObserver() {
}

export function removeMigrationObserver() {
}

export function addSessionRestoreObserver() {
}

export function removeSessionRestoreObserver() {
}

export function getLocale() {
  return window.navigator.language || window.navigator.userLanguage || 'en';
}

export function getWindow() {
  return window;
}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}

export function getCookies() {

}

export function disableChangeEvents() {}

export function isDefaultBrowser() {
  return Promise.resolve(null);
}

export function isPrivateMode() {
  return false;
}

/* eslint-disable no-param-reassign */
export function openLink(win, url) {
  if (url !== '#') {
    if (url.indexOf('http') === -1) {
      url = `http://${url}`;
    }
    win.location.href = url;
  }

  return false;
}
/* eslint-enable no-param-reassign */
