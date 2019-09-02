/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global localStorage */

const localStore = {
  setItem(key, value) {
    localStorage.setItem(key, value);
  },
  getItem(key) {
    return localStorage.getItem(key);
  }
};

const dummyStore = {
  setItem() {},
  getItem() {},
};

const getStore = () => {
  try {
    // test if localStorage is available - if so it should not throw
    localStorage.getItem('<whatever>');

    return localStore;
  } catch (e) {
    return dummyStore;
  }
};

export default getStore();
