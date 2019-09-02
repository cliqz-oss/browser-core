/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import pako from 'pako';

/**
 * @param {!string} uncompressed input
 * @returns {Uint8Array} gzipped output
 */
export function compress(str) {
  return pako.gzip(str);
}

/**
 * @param {!string} gzipped input
 * @returns {string} uncompressed output
 */
export function decompress(str) {
  return pako.gunzip(str, { to: 'string' });
}
