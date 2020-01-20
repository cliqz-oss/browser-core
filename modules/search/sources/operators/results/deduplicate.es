/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { hasMainLink } from '../links/utils';

/**
 * Removes duplicate URL within a results. For example, to remove the same URL
 * occuring once with http and once with https.
 *
 * NOTE: speed-up x3
 */
export default function (results) {
  const seenUrls = new Set();
  const deduplicatedResults = [];

  for (const result of results) {
    // Only keep links which have not been seen before
    const deduplicatedLinks = [];
    for (const link of result.links) {
      const url = link.meta.url;
      if (seenUrls.has(url) === false) {
        seenUrls.add(url);
        deduplicatedLinks.push(link);
      }
    }

    // Make sure result is not empty after dedup
    if (hasMainLink({ links: deduplicatedLinks })) {
      deduplicatedResults.push({
        ...result,
        links: deduplicatedLinks,
      });
    }
  }

  return deduplicatedResults;
}
