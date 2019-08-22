/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { clean, getMainLink } from './normalize';
import { convertMainLinkToHistorySubLink } from './links/utils';

const group = (a, b) =>
  a.set(b.domain, [...(a.get(b.domain) || []), b]);

const flatten = (a, b) => {
  a.push(...b);
  return a;
};

// based https://stackoverflow.com/a/1917041
const sharedStart = (array) => {
  const A = array.concat().sort();
  const a1 = A[0];
  const a2 = A[A.length - 1];
  const L = a1.length;
  let i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) {
    i += 1;
  }
  return a1.substring(0, i);
};

const extractCommonPrefix = (links) => {
  const paths = links
    .map(getMainLink)
    .filter(Boolean)
    .map(r => r.href);
  return sharedStart(paths);
};

const makeHeader = (domain, query, scheme = 'http', provider) => {
  const url = `${scheme}://${domain}/`;
  return clean({
    title: domain,
    url,
    text: query,
    provider,
    meta: {
      level: 0,
      type: 'main',
      isConstructed: true,
    },
  });
};

// TODO: cluster by subdomains (e.g., maps.google.com)
// TODO: set max. domain count for clustering
/*
 * Clusters (history) results by domain.
 *
 * @param {Object} response - The provider's response.
 */
const cluster = (({ results, ...response }) => {
  const clustered = Array
    .from(results
      .map(result => ({ ...result, domain: getMainLink(result).meta.hostAndPort }))
      .reduce(group, new Map())
      .entries())
    .map(([domain, grouped]) => {
      if (grouped.length === 1 || domain === '') {
        return grouped;
      }

      const prefix = extractCommonPrefix(grouped);
      let main = grouped
        .find(result => getMainLink(result).url === prefix);

      if (!main) {
        main = grouped
          .find(result => getMainLink(result).meta.url === domain);
      }

      const isHttps = grouped
        .every(result => getMainLink(result).url.startsWith('https'));
      // TODO: can we use HTTPs everywhere to determine if a domain supports https?
      const scheme = isHttps ? 'https' : 'http';
      // TODO: there is a chance that the domain on its own does not exist
      //       (in particular without 'www')
      const query = response.query;

      let header;

      if (main) {
        // do not mutate original result but deep clone
        const mainLink = getMainLink(main);
        header = {
          ...mainLink,
          extra: {
            ...mainLink.extra,
          },
          meta: {
            ...mainLink.meta,
          },
          kind: [...mainLink.kind],
        };
      }

      if (!header) {
        header = makeHeader(domain, query, scheme, response.provider);
      }

      header.kind = ['C', ...header.kind];
      header.meta = { ...header.meta, isCluster: true };

      const rest = grouped.filter(result => result !== main);

      return [{
        links: [
          header,
          // additional links (buttons etc.) from main result
          // TODO: assumes first is 'main' link
          ...(main && main.links.slice(1)) || [],
          // only main link from other results
          ...rest
            .map((result) => {
              const link = getMainLink(result);
              return convertMainLinkToHistorySubLink(link);
            }),
        ],
      }];
    })
    .reduce(flatten, []);

  return {
    ...response,
    results: clustered,
  };
});

export default cluster;
