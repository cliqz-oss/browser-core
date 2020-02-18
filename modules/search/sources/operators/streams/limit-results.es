/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';
import { revertHistorySubLinkToMainLink } from '../links/utils';

// Find the index of the first history link after limit
// Because we don't want to remove other type of links (buttons, simple_links, etc.)
// So we keep everything before the unneeded history
// Note: requires `enricher` to put other types of links before history
const findIndexToSlice = (links, nHistories) => {
  if (links.filter(link => ['history', 'main'].includes(link.meta.type)).length <= nHistories) {
    // If we have enough slots for all history links
    return links.length;
  }

  let nHistoriesFound = 0;
  for (let i = 0; i < links.length; i += 1) {
    if (['history', 'main'].includes(links[i].meta.type)) {
      nHistoriesFound += 1;
      if (nHistoriesFound === nHistories + 1) {
        return i;
      }
    }
  }

  return nHistories;
};

const limitHistoryLinksInResult = (result, limit) => {
  // If a cluster was reduced to a single link and there is sub-link
  // Take sub-link if the main link is constructed
  if (limit === 1 && result.links.length > 1 && result.links[0].meta.isConstructed) {
    const subResultMainLink = revertHistorySubLinkToMainLink(result.links[1]);
    return {
      ...result,
      links: [subResultMainLink],
    };
  }

  const indexToSlice = findIndexToSlice(result.links, limit);

  return {
    ...result,
    links: result.links.slice(0, indexToSlice),
  };
};

export function limitHistoryResults(results, limit) {
  const limitedResults = [];
  let nAddedHistoryLinks = 0;

  for (let i = 0; i < results.length; i += 1) {
    const reservedSlots = (results.length - 1) - i; // Minimum 1 slot for each result
    const availableSlots = limit - (nAddedHistoryLinks + reservedSlots);
    const limitedResult = limitHistoryLinksInResult(results[i], availableSlots);
    nAddedHistoryLinks += limitedResult.links
      .filter(link => ['history', 'main'].includes(link.meta.type)).length;

    limitedResults.push(limitedResult);
  }

  return limitedResults;
}

/**
 * Factory for the `limitResults` operator, which limits the number of results
 * shown per provider.
 *
 * @function limitResults
 * @param {Object} config - The configuration.
 * @param {Object} config.operators.streams.limitResults.limits -
 *   The limits (per provider).
 */
export default ({
  operators: {
    streams: {
      limitResults: {
        limits = {},
      } = {},
    } = {},
  } = {},
}) => pipe(map(({ responses, ...result }) => ({
  ...result,
  responses: responses.map(({ provider, results, ...response }) => {
    const limit = limits[provider];
    let resultsAfterLimit = results.slice(0, limit);

    if (provider === 'history' && limits.cluster) {
      resultsAfterLimit = limitHistoryResults(resultsAfterLimit, limits.cluster);
    }

    return {
      provider,
      results: resultsAfterLimit,
      ...response,
    };
  })
})));
