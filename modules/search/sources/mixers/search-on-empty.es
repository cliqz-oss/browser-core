/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { merge } from 'rxjs';
import { filter, take, flatMap, isEmpty, mapTo } from 'rxjs/operators';
import { getEmptyResponse } from '../responses';

const _hasNoResults = response =>
  response.state === 'done' && response.results.length === 0;

const _hasAnyResults = response =>
  response.results.length > 0;

const _alwaysTrue = () => true;

/*
 * Starts search using given provider if given base stream
 * conforms to the given condition (for example, without results).
 *
 * @param {Object} provider - The provider.
 * @param {Observable} base$ - The stream.
 * @param {String} query - The query.
 * @param {Object} config
 * @param {Object} params
 * @param {Function} condition
 * @return {Observable}
 */
const searchIf = (provider, base$, query, config, params, condition = _alwaysTrue) =>
  merge(
    // only start searching if condition is met
    base$.pipe(
      filter(condition),
      take(1),
      flatMap(() =>
        provider
          .search(query, config, params))
    ),
    // emit empty response if nothing else was emitted
    base$.pipe(
      filter(condition),
      isEmpty(),
      filter(Boolean),
      mapTo(getEmptyResponse(provider.id, config, query))
    )
  );

export const searchOnEmpty = (provider, base$, query, config, params) =>
  searchIf(provider, base$, query, config, params, _hasNoResults);

export const searchOnNotEmpty = (provider, base$, query, config, params) =>
  searchIf(provider, base$, query, config, params, _hasAnyResults);
