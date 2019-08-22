/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { filter } from 'rxjs/operators';

const shouldIgnore = (name, config) =>
  // 'rich-header' is a non-stand-alone provider, it's only queried from 'cliqz'
  name === 'rich-header'
  // ignore 'querySuggestions' if it is disabled
  || (name === 'querySuggestions' && !config.providers.querySuggestions.isEnabled);

/**
 * Factory for the `waitForAllProviders` operator, which ensures that results
 * are only emitted once all providers are done (if this operator is enabled
 * via config). Note that the slowest provider will determine when results
 * are shown.
 *
 * @function waitForAllProviders
 * @param {Object} result - The result all available responses.
 */
export default config => pipe(filter(({ responses }) => {
  const { isEnabled } = config.operators.streams.waitForAllProviders;

  if (!isEnabled) {
    return true;
  }

  // TODO: copied from `smoothResults`
  const providerNames = Object.keys(config.providers)
    .sort((a, b) => config.providers[a].order - config.providers[b].order);

  const allDone = providerNames
    .filter(name => !shouldIgnore(name, config))
    .map(name => responses.find(response => response.provider === name))
    .every(response => response && response.state === 'done');

  return allDone;
}));
