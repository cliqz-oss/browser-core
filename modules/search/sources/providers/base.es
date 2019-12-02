/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { from } from 'rxjs';

import { getResponse, getEmptyResponse } from '../responses';
import logger from '../logger';

export default class BaseProvider {
  constructor(id) {
    this.id = id;
  }

  init() {}

  unload() {}

  /**
   * Given an array of results (which may be empty), hide complexity of creating
   * a stream using Rx behind this helper. Note that `results` should be a valid
   * array of result objects.
   */
  getResultsFromArray(results, query, config) {
    if (results.length === 0) {
      return this.getEmptySearch(config, query);
    }

    return from([
      getResponse({
        provider: this.id,
        config,
        query,
        results,
        state: 'done',
      }),
    ]);
  }

  /**
   * Same as `getResultsFromArray(...)` but this time results will be emitted
   * once the promise `resultsPromise` resolves. If it rejects then we consider
   * this to be empty results.
   */
  getResultsFromPromise(resultsPromise, query, config) {
    return from(
      resultsPromise
        .catch((ex) => {
          logger.log('exception from provider', this.id, ex);
          return [];
        })
        .then(results =>
          getResponse({
            provider: this.id,
            config,
            query,
            results,
            state: 'done',
          })),
    );
  }

  getEmptySearch(config, query) {
    return from([getEmptyResponse(this.id, config, query)]);
  }
}
