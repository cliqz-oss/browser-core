/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function isCliqzAction(url) {
  return url.match(/^cliqz-actions,/);
}

export function urlStripProtocol(url, { stripTrailingSlash } = { stripTrailingSlash: true }) {
  let lowerCaseURL = url.toLowerCase();
  let resultUrl = url;
  const toRemove = [
    'https://', 'http://',
    'www2.', 'www.',
    'mobile.', 'mobil.', 'm.'
  ];

  for (let i = 0; i < toRemove.length; i += 1) {
    const part = toRemove[i];
    if (lowerCaseURL.startsWith(part)) {
      resultUrl = resultUrl.substr(part.length);
      lowerCaseURL = lowerCaseURL.substr(part.length);
    }
  }

  // remove trailing slash as well to have all urls in the same format
  if (stripTrailingSlash && resultUrl.endsWith('/')) {
    resultUrl = resultUrl.substr(0, resultUrl.length - 1);
  }

  return resultUrl;
}
