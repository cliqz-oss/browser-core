/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-bitwise */

import crypto from '../../platform/crypto';

// Cryptographically secure Math.random replacement
//
//  Doing the same as Firefox Math.random does, but with a crypto secure 64 bit number instead.
//  The equivalent in C++ is: double(uint64val & 0x1FFFFFFFFFFFFF) / (1 << 53);
//  WARNING: In tests (Linux), considerably slower than Math.random (5-10 times)
export default function random() {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return (((2 ** 32) * (values[0] & 0x1FFFFF)) + values[1]) / (2 ** 53);
}

export function randomInt() {
  return Math.floor(random() * Number.MAX_SAFE_INTEGER);
}
