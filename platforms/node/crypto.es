/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-bitwise */
export default {
  getRandomValues: (_arr) => {
    const array = _arr;
    for (let i = 0; i < array.length; i += 1) {
      array[i] = Math.floor(Math.random() * 4294967296) >>> 0;
    }
    return array;
  }
};
/* eslint-enable no-bitwise */
