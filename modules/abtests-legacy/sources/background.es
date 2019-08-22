/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import ABTests from './ab-tests';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  requiresServices: ['session', 'telemetry', 'pacemaker'],
  /**
    @method init
    @param settings
  */
  init() {
    this.loadingAbtestPromise = ABTests.check();
    ABTests.start();
  },

  unload() {
    ABTests.stop();
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    getRunningTests() {
      const current = ABTests.getCurrent();
      if (current) {
        return current;
      }
      return this.loadingAbtestPromise;
    },
  },
});
