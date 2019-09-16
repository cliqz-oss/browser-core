/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';
import addLogos from '../results/add-logos';
import addDistance from '../results/add-distance';

const compose = fns => target => fns.reduce((ret, fn) => fn(ret), target);

// TODO: add tests

/**
 * Factory for the `enhanceResults` operator, which adds logo and distance
 * information to results.
 *
 * @function enhanceResults
 */
export default () =>
  pipe(map(({
    query,
    responses,
    ...result
  }) => ({
    // TODO: keep spread all?
    ...result,
    query,
    responses: responses.map(response => ({
      // TODO: keep spread all?
      ...response,
      results: compose([
        addLogos,
        addDistance,
      ])(response.results),
    })),
  })));
