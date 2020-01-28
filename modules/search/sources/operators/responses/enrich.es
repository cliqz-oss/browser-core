/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from '../../logger';

import { getMainLink } from '../links/utils';
import deduplicate from '../results/deduplicate';

const containsRichInfo = (result) => {
  const mainLink = getMainLink(result);
  return result.links > 1
     || mainLink.type === 'rh'
    || (mainLink.extra && mainLink.extra.rich_data);
};


const enrichSublinks = (target, source) => {
  const sourceSublinks = source.links.slice(1);
  const targetSublinks = target.links.slice(1);
  const sourceLinksMap = new Map(
    sourceSublinks.map(link => [link.meta && link.meta.url, link])
  );

  const sublinks = targetSublinks.map((link) => {
    if (link.meta.url) {
      const richLink = sourceLinksMap.get(link.meta.url);
      if (richLink) {
        sourceLinksMap.delete(link.meta.url);
        return {
          ...richLink,
          style: [link.style, richLink.style].filter(Boolean).join(' '),
          provider: link.provider,
          kind: richLink.kind.concat(link.kind),
        };
      }
    }
    return link;
  });

  // Keeping the following order is crucial for `limit-results` to work as
  // intended:
  //  1. Sublinks from source (i.e., backend), such as news items or buttons
  //  2. Sublinks from target (i.e., history)
  return Array.from(sourceLinksMap).map(([, link]) => link).concat(sublinks);
};


/*
 * Adds rich data from one to the other response. For example, enriches
 * history results with data from backend results.
 *
 * @param {Object} response - The response to enrich.
 * @param {Object} source - The response to take rich data from.
 * @param {Map} cache - The cache for rich data.
 */
export default ({ results, ...response }, source, cache) => {
  const sources = new Map();
  source.results
    .map(result => [
      getMainLink(result),
      result,
    ])
    .forEach(([main, result]) => sources.set(main && main.meta.url, result));

  const enrichedResults = results.map((result) => {
    const main = getMainLink(result);
    const url = main.meta.url;

    const match = cache.get(url) || sources.get(url);
    if (!match || !containsRichInfo(match)) {
      return result;
    }
    logger.debug(`Enrich '${url}' (cached: ${cache.has(url)})`,
      result, match);

    const matchMainLink = getMainLink(match);
    const enrichedSublinks = enrichSublinks(result, match);

    const updated = {
      ...result,
      links: [
        {
          ...matchMainLink,
          style: [main.style, matchMainLink.style].filter(Boolean).join(' '),
          provider: main.provider,
          kind: main.kind,
          text: main.text,
          extra: {
            ...matchMainLink.extra,
            ...main.extra,
          },
          meta: {
            ...main.meta,
            originalUrl: main.url,
            isEnriched: true,
          },
        },
        ...enrichedSublinks,
      ]
    };
    cache.set(url, match);
    return updated;
  });

  return {
    ...response,
    // Enriching may introduce duplicate results,
    // and history itself may contain duplicates
    results: deduplicate(enrichedResults),
  };
};
