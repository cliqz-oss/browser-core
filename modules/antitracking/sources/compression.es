/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { toBase64 } from '../core/encoding';
import { compress } from '../core/gzip';

export function compressionAvailable() {
  return compress !== false;
}

export function compressJSONToBase64(obj) {
  const bytes = compress(JSON.stringify(obj));
  return toBase64(bytes);
}
