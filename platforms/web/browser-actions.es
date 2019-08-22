/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import events from '../core/events';

export function handleQuerySuggestions(q, suggestions) {
  events.pub('search:suggestions', {
    query: q,
    suggestions,
  });
}

export function queryCliqz() {}

export function openLink() {}

export function openTab() {}

export function getOpenTabs() {}

export function getReminders() {}
