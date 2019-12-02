/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import inject from '../core/kord/inject';
import config from '../core/config';
import extMessaging from '../platform/ext-messaging';

function sendTelemetry(signal, schema, instant) {
  extMessaging.sendMessage(config.settings.telemetryExtensionId, {
    moduleName: 'core',
    action: 'sendTelemetry',
    args: [signal, instant, schema],
  });
}

/**
  @namespace anolysis-remote
  @class Background
 */
export default background({
  requiresServices: ['telemetry'],
  telemetryService: inject.service('telemetry', ['installProvider', 'uninstallProvider']),

  /**
    @method init
    @param settings
  */
  init(settings) {
    this.telemetryProvider = {
      name: 'anolysis-remote',
      send: sendTelemetry,
    };
    if (settings.telemetryExtensionId) {
      this.telemetryService.installProvider(this.telemetryProvider);
    }
  },

  unload() {
    if (this.telemetryExtensionId) {
      this.telemetryService.uninstallProvider(this.telemetryProvider);
    }
  },

  events: {

  },

  actions: {

  },
});
