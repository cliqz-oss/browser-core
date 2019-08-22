/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { hasMainLink } from '../links/utils';

/**
  Removes links with duplicate URLs in a response.

  @param {Object} response The response to remove links from.
  @param {Map} duplicates The Map of duplicate URLs.
  @return {Object} The response without duplicate links.
*/
const deduplicate = ({ results, ...rest }, duplicates) => ({
  ...rest,
  results: results
    .map(({ links, ...result }) => ({
      ...result,
      links: links
        .filter(({ meta: { url } }) => !duplicates.has(url)),
    }))
    .filter(hasMainLink),
});

const annotate = ({ results, ...rest }, duplicates) => ({
  results: results.map(({ links }) => ({
    links: links.map((link) => {
      if (!duplicates.has(link.meta.url)) {
        return link;
      }

      const duplicate = duplicates.get(link.meta.url);
      return {
        ...link,
        kind: [
          ...link.kind,
          ...duplicate.kind,
        ],
      };
    }),
  })),
  ...rest,
});

export { annotate, deduplicate };
