/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import random from '../crypto/random';

// creates a random 'len' long string from the input space
export default function rand(len, _space) {
  let ret = '';
  let i;
  const space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const sLen = space.length;

  for (i = 0; i < len; i += 1) {
    ret += space.charAt(Math.floor(random() * sLen));
  }

  return ret;
}
