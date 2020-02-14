/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import inject from '../core/kord/inject';

import metrics from './telemetry/metrics';
import analyses from './telemetry/analyses';

export default background({
  requiresServices: ['telemetry'],
  telemetry: inject.service('telemetry', ['register']),
  telemetrySchemas: [
    ...metrics,
    ...analyses,
  ],

  init() {
    this.telemetry.register(this.telemetrySchemas);
  },

  unload() {
    this.telemetry.unregister(this.telemetrySchemas);
  },

  events: {},

  actions: {
  },
});
