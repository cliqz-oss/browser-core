/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function currentURI() {}

export function contextFromEvent() {
  return null;
}

export function isWindowActive() {
  return true;
}

export function checkIsWindowActive() {
  return Promise.resolve(true);
}

export function forEachWindow() {
}

export function setOurOwnPrefs() {
}

export function addWindowObserver() {
}

export function removeWindowObserver() {
}

export function addSessionRestoreObserver() {
}

export function removeSessionRestoreObserver() {
}

export function addMigrationObserver() {
}

export function removeMigrationObserver() {
}

export function getLocale() {
  return 'en';
}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}

export function getCookies() {
  return Promise.reject();
}

export function isDefaultBrowser() {
  return Promise.resolve(null);
}

export function isPrivateMode() {
  return false;
}
