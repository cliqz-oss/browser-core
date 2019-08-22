/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable import/prefer-default-export */

// Ends with .ghostery.net or .ghostery.com or .cliqz.com or .foxyproxy.com
const regexpMatcher = /(?:[.]ghostery[.](?:net|com)|[.]cliqz[.]com|[.]foxyproxy[.]com)$/;

// Do not remove headers for these
const whitelist = new Set([
  'human-eval.cliqz.com',
  'accountapi.ghostery.com',
  'consumerapi.ghostery.com',
  'accountapi.ghostery.net',
  'consumerapi.ghostery.net',
  'telemetry.privacy.cliqz.com',
]);

export function isSafeToRemoveHeaders(hostname) {
  return regexpMatcher.test(hostname) && !whitelist.has(hostname);
}
