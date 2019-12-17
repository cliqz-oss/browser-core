/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome } from '../platform/globals';

import telemetry from '../core/services/telemetry';

export default {
  init() {
    this.onVisited = () => {
      telemetry.push({ visitsCount: 1 }, 'metrics.history.visits.count');
    };
    chrome.history.onVisited.addListener(this.onVisited);
  },

  unload() {
    chrome.history.onVisited.removeListener(this.onVisited);
  },

  events: {
  },
};
