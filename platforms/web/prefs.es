/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const storage = localStorage;

export function getPref(pref, fallback) {
  // local storage saves only strings
  const mypref = storage.getItem(pref);
  if (mypref) {
    if (mypref === 'false') {
      return false;
    }
    if (mypref === 'true') {
      return true;
    }
    if (!isNaN(mypref)) {
      return parseInt(mypref, 10);
    }
    return mypref;
  }
  return fallback;
}

export function setPref(pref, val) {
  storage.setItem(pref, val);
}

export function hasPref(pref) {
  return Boolean(storage.getItem(pref));
}

export function clearPref(pref) {
  storage.removeItem(pref);
}

export function init() {
  return Promise.resolve();
}

export function getAllCliqzPrefs() {
}
