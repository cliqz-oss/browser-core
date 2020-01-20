/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import language from '../core/language';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import pacemaker from '../core/services/pacemaker';

export default background({
  requiresServices: ['session', 'pacemaker', 'host-settings'],

  init(settings = {}, _browser, { services }) {
    this.settings = settings;
    this.hostSettings = services['host-settings'];

    language.init();

    this.report = pacemaker.setTimeout(this.reportStartupTime.bind(this), 1000 * 60);
  },

  unload() {
    pacemaker.clearTimeout(this.report);
    this.report = null;

    language.unload();
  },

  async reportStartupTime() {
    const core = inject.module('core');
    const status = await core.action('status');

    const telemetry = inject.service('telemetry', ['push']);

    await telemetry.push(
      Object.keys(status.modules).map((module) => {
        const moduleStatus = status.modules[module];
        return {
          module,
          isEnabled: moduleStatus.isEnabled,
          loadingTime: moduleStatus.loadingTime,
          loadingTimeSync: moduleStatus.loadingTimeSync,
        };
      }),
      'metrics.performance.app.startup',
    );

    const resourceLoaderReport = await core.action('reportResourceLoaders');

    telemetry.push(
      Object.keys(resourceLoaderReport).map(name => ({
        name,
        size: resourceLoaderReport[name].size,
      })),
      'metrics.performance.app.resource-loaders',
    );
  },

  actions: {
    async getSupportInfo() {
      const version = this.settings.version;
      const host = await this.hostSettings.get('distribution.id', '');
      const hostVersion = await this.hostSettings.get('distribution.version', '');
      const info = {
        version,
        host,
        hostVersion,
        country: prefs.get('config_location', ''),
        status: prefs.get('ext_status', '') || 'active',
      };
      return info;
    }
  }

});
