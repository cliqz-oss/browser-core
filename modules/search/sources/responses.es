/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const getResponse = ({
  provider,
  config,
  query,
  suggestions = [],
  results = [],
  state
}) =>
  Object.assign(Object.create(null), {
    provider,
    config,
    query,
    results,
    state,
    suggestions,
  });

const getEmptyResponse = (provider, config, query) =>
  getResponse({ provider, config, query, state: 'done' });

const getPendingResponse = (provider, config, query) =>
  getResponse({ provider, config, query, state: 'pending' });

export { getResponse, getEmptyResponse, getPendingResponse };
