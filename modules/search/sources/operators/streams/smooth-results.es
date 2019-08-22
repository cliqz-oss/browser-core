/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { scan } from 'rxjs/operators';

import smoothClusters from '../responses/smooth-clusters';
import smoothResponses from '../responses/smooth-responses';
import { hasResults, isDone } from '../responses/utils';

const smoothResults = (
  previousResult,
  currentResult,
  config
) => {
  const { isEnabled } = config.operators.streams.smoothResults;

  // prepare for sorting results by providers according to config
  const providerNames = Object.keys(config.providers)
    .sort((a, b) => config.providers[a].order - config.providers[b].order);

  return {
    query: currentResult.query,
    responses: providerNames
      .map((name) => {
        const previousResponse = previousResult.responses.find(
          response => response.provider === name
        );
        const currentResponse = currentResult.responses.find(
          response => response.provider === name
        );

        if (!isEnabled) {
          return currentResponse;
        }

        // current response is done: take it
        if (isDone(currentResponse)) {
          return currentResponse;
        }

        // current response has results but is not done yet: merge with
        // previous response using `smoothResponses` and `smoothClusters`
        if (hasResults(currentResponse)) {
          return smoothClusters(
            previousResponse,
            smoothResponses(previousResponse, currentResponse, config),
            config
          );
        }

        return previousResponse;
      })
      // remove undefined values of providers without response
      .filter(Boolean)
  };
};

/**
 * Factory for the `smoothResults` operator, which reduces dropdown flickering
 * due to changing numbers of results. `smoothResults` updates results
 * progressively, keeping results from each provider until new results from
 * this provider arrive. `smoothResults` also ensures the correct order
 * of providers (according to the configuration).
 *
 * @function smoothResults
 * @param {Object} config - The configuration.
 * @param {Object} config.providers - Available providers (with order).
 */
export default config => pipe(scan(
  (previousResult, currentResult) =>
    smoothResults(previousResult, currentResult, config),
  // initial value (result) for `scan`
  { responses: [] }
));
