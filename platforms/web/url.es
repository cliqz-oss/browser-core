/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export { LocalUrlRegExp, UrlRegExp } from '../platform-webextension/url';
const KNOWN_PROTOCOLS = new Set(['http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'data']);

export function isKnownProtocol(protocol) {
  return KNOWN_PROTOCOLS.has(protocol.replace(/:$/, '').toLowerCase());
}

export default function equal(url1, url2) {
  return url1 === url2;
}
