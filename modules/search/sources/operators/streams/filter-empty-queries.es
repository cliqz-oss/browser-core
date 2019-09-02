/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

// TODO: add tests

/**
 * Factory for the `mergeResults` operator, which merges multiple responses
 * (from different providers) into a single response.
 *
 * @function mergeResults
 */
export default () => pipe(map(({ query, responses }) => {
  if (!query.query && !query.allowEmptyQuery) {
    // TODO: create (shared) result constructor?
    return {
      query,
      responses: [
        {
          results: [],
        },
      ]
    };
  }
  return { query, responses };
}));
