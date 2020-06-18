/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import inject from '../core/kord/inject';


export default background({
  requiresServices: ['telemetry'],

  deps: {
    controlCenter: inject.module('control-center'),
  },

  /**
    @method init
    @param settings
  */
  init() {
  },

  unload() {
  },

  events: {

  },

  actions: {
    getUserProfileNames: () => browser.runtime.getUserProfileNames(),
    startMigration: profiles => Promise.all(profiles.map(p => browser.runtime.migrateToFirefox(p)))
  },
});
