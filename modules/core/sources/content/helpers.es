/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Check if `window` is the top-level window.
 */
export function isTopWindow(window) {
  return window.self === window.top;
}

/**
 * Return a `Promise` which resolves once `window.document.body` exists. If it's
 * already the case when the function is invoked, then the promise resolves
 * immediately, otherwise it waits for the `DOMContentLoaded` event to trigger.
 */
export function documentBodyReady() {
  if (window.document && window.document.body) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener('DOMContentLoaded', resolve, { once: true });
  });
}
