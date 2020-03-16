/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import inject from '../core/kord/inject';

import metrics from './telemetry/metrics/performance';

export default background({
  requiresServices: ['telemetry'],
  telemetry: inject.service('telemetry', ['register', 'unregister']),

  init() {
    this.telemetry.register(metrics);
  },

  unload() {
    this.telemetry.unregister(metrics);
  },

  events: {},

  actions: {
  },
});
