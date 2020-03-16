/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import pacemaker from '../core/services/pacemaker';

export default background({
  requiresServices: ['session', 'pacemaker', 'host-settings'],
  telemetry: inject.service('telemetry', ['push']),
  core: inject.module('core'),

  init(settings = {}, _browser, { services }) {
    this.settings = settings;
    this.hostSettings = services['host-settings'];
    this.reportStartupTimeout = pacemaker.setTimeout(() => this.reportStartupTime(), 1000 * 60);
    this.reportVersionTimeout = pacemaker.register(() => this.reportVersion(), {
      timeout: 1000 * 60 * 60,
      startImmediately: true,
    });
  },

  unload() {
    pacemaker.clearTimeout(this.reportStartupTimeout);
    this.reportStartupTimeout = null;

    pacemaker.clearTimeout(this.reportVersionTimeout);
    this.reportVersionTimeout = null;
  },

  async reportVersion() {
    return this.telemetry.push({}, 'core.metric.ping.hourly');
  },

  async reportStartupTime() {
    const status = await this.core.action('status');
    await this.telemetry.push(
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

    const resourceLoaderReport = await this.core.action('reportResourceLoaders');
    this.telemetry.push(
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
