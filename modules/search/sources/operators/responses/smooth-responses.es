/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getMainLink } from '../links/utils';

/**
 * Updates results (of the same provider) progressively by keeping results from
 * an old response until all results from the new response have arrived. This
 * is to further reduce dropdown flickering due to changing numbers of results.
 *
 * @function smoothResponses
 * @param {Object} oldResponse - The old response.
 * @param {Object[]} oldResponse.results - The corresponding results.
 * @param {Object} newResponse - The new response.
 * @param {Object[]} oldResponse.results - The corresponding results.
 * @param {Object} config - The configuration.
 * @param {Object} config.operators.responses.smoothResponses.isEnabled -
 *  The enable switch.
 */
export default (
  { results: oldResults } = {},
  newResponse,
  config
) => {
  const { isEnabled } = config.operators.responses.smoothResponses;

  if (!isEnabled || !oldResults) {
    return newResponse;
  }

  const { results: newResults } = newResponse;

  // find results that are present in old but not in new response
  const newResultsByUrl = new Map();
  newResults.forEach(newResult =>
    newResultsByUrl.set(getMainLink(newResult).url, newResult));

  const spareOldResults = oldResults.filter(oldResult =>
    !newResultsByUrl.has(getMainLink(oldResult).url));

  return {
    ...newResponse,
    results: [
      ...newResults,
      ...spareOldResults,
    ],
  };
};
