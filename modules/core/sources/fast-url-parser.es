/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import punycode from '../platform/lib/punycode';
import { URL, getPunycodeEncoded as _getPunycodeEncoded } from '../platform/lib/cliqz-url-parser';

export default URL;

const KNOWN_PROTOCOLS = new Set([
  'http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'moz-extension', 'chrome-extension',
  'view-source', 'data', 'dat', 'resource',
]);

export function isKnownProtocol(protocol) {
  return KNOWN_PROTOCOLS.has(protocol.toLowerCase());
}
export function getPunycodeEncoded(url) {
  return _getPunycodeEncoded(punycode.toASCII, url);
}
