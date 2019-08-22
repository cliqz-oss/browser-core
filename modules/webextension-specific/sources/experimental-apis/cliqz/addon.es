/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals AddonManager, Components */

Components.utils.import('resource://gre/modules/AddonManager.jsm');

function _getAddon(id) {
  return new Promise((resolve) => {
    const promise = AddonManager.getAddonByID(id, resolve);

    if (promise && promise.then) {
      promise.then(resolve);
    }
  });
}

export default function changeAddonState(id, state) {
  _getAddon(id).then((addon) => {
    if (state === true) {
      addon.enable();
    } else {
      addon.disable();
    }
  });
}
