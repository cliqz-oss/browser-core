/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import historySearch from '../platform/history/search';

/**
 * This global state used to be stored on core/utils and was moved here to ease
 * its refactoring in the future. It is only needed for integrations tests. One
 * option would be to move this logic to a service instead.
 */
let historySearchHandler = historySearch;

export function overrideHistorySearchHandler(handler) {
  historySearchHandler = handler;
}

export function resetHistorySearchHandler() {
  historySearchHandler = historySearch;
}

export default function (...args) {
  return historySearchHandler(...args);
}
