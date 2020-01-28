/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function isUint8ArrayEqual(x: Uint8Array, y: Uint8Array) {
  if (x.length !== y.length) {
    return false;
  }
  for (let i = 0; i < x.length; i += 1) {
    if (x[i] !== y[i]) {
      return false;
    }
  }
  return true;
}
