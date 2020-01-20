/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../kord/inject';

import modules from './modules';
import Service from './service';
import LifeCycle from './life-cycle';
import Logger from '../logger';

export { lifecycleEvents } from './life-cycle';

export default class Module extends LifeCycle {
  constructor(name) {
    super(
      name,
      Logger.get('life-cycle', {
        level: 'log',
        prefix: `[lifecycle:${name}]`,
      })
    );

    this._init = (...args) => this.background.init(...args);
    this._unload = () => this.background.unload();
  }

  get providedServices() {
    if (this._services) {
      return this._services;
    }

    this._services = Object.create(null);

    Object.keys(this.background.providesServices || {})
      .forEach((serviceName) => {
        const initializer = this.background.providesServices[serviceName];
        this._services[serviceName] = new Service(initializer);
      });

    return this._services;
  }

  get requiredServices() {
    return this.background.requiresServices || [];
  }

  get _module() {
    return modules[this.name] || {};
  }

  get background() {
    return this._module;
  }

  status() {
    return {
      name: this.name,
      isEnabled: this.isEnabled || this.isEnabling,
      loadingTime: this.loadingTime,
      loadingTimeSync: this.loadingTimeSync,
      state: this.isEnabled && this.background.getState && this.background.getState(),
    };
  }

  action(name, ...args) {
    return inject.module(this.name).action(name, ...args);
  }
}
