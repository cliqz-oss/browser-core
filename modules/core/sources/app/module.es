/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */

import console from '../console';
import modules from './modules';
import Defer from '../helpers/defer';
import Service from './service';
import inject from '../kord/inject';
import EventEmitter from '../event-emitter';
import { ModuleDisabledError } from './module-errors';

export const lifecycleEvents = {
  enabled: 'enabled',
  disabled: 'disabled',
};
const eventNames = Object.keys(lifecycleEvents).map(k => lifecycleEvents[k]);

const AppStates = Object.freeze({
  NOT_INITIALIZED: Symbol('NOT_INITIALIZED'),
  ENABLING: Symbol('ENABLING'),
  ENABLED: Symbol('ENABLED'),
  DISABLED: Symbol('DISABLED'),
});

export default class Module extends EventEmitter {
  constructor(name, settings, browser) {
    super(eventNames);
    this.name = name;
    this.loadingTime = 0;
    this.loadingTimeSync = 0;
    this.settings = settings;
    this._browser = browser;
    this._bgReadyDefer = new Defer();
    this._state = AppStates.NOT_INITIALIZED;
    this._stat = {
      init: 0,
      load: 0
    };
  }

  get providedServices() {
    if (this._services) {
      return this._services;
    }

    this._services = Object.create(null);

    Object.keys(this.backgroundModule.providesServices || {})
      .forEach((serviceName) => {
        const initializer = this.backgroundModule.providesServices[serviceName];
        this._services[serviceName] = new Service(initializer);
      });

    return this._services;
  }

  get requiredServices() {
    return this.backgroundModule.requiresServices || [];
  }

  isReady() {
    return this._bgReadyDefer.promise;
  }

  get _module() {
    return modules[this.name] || {};
  }

  get backgroundModule() {
    return this._module;
  }

  get isNotInitialized() {
    return this._state === AppStates.NOT_INITIALIZED;
  }

  get isEnabled() {
    return this._state === AppStates.ENABLED;
  }

  get isEnabling() {
    return this._state === AppStates.ENABLING;
  }

  get isDisabled() {
    return this._state === AppStates.DISABLED;
  }

  markAsEnabling() {
    if (!this.isEnabling) {
      this._state = AppStates.ENABLING;
      this._bgReadyDefer = new Defer();
    }
  }

  markAsDisabled() {
    this._state = AppStates.DISABLED;
    this._bgReadyDefer.reject(new ModuleDisabledError(this.name));
  }

  enable() {
    console.log('Module', this.name, 'start loading');
    this.markAsEnabling();
    const loadingStartedAt = Date.now();
    return Promise.resolve(this.backgroundModule)
      .then((background) => {
        this.background = background;
        const loadingSyncStartedAt = Date.now();
        const initPromise = background.init(this.settings, this._browser);
        this.loadingTimeSync = Date.now() - loadingSyncStartedAt;
        return initPromise;
      })
      .then(() => {
        this._state = AppStates.ENABLED;
        this.loadingTime = Date.now() - loadingStartedAt;
        console.log('Module: ', this.name, ' -- loaded');
        this._bgReadyDefer.resolve();
        this.emit(lifecycleEvents.enabled);
      })
      .catch((e) => {
        this._state = AppStates.DISABLED;
        this._bgReadyDefer.reject(e);
        throw e;
      });
  }

  disable() {
    console.log('Module', this.name, 'start unloading');
    const background = this.background;
    if (background) {
      background.unload();
    }
    this._state = AppStates.DISABLED;
    this.loadingTime = null;
    this._bgReadyDefer = new Defer();
    console.log('Module', this.name, 'unloading finished');
    this.emit(lifecycleEvents.disabled);
  }

  status() {
    return {
      name: this.name,
      isEnabled: this.isEnabled || this.isEnabling,
      loadingTime: this.loadingTime,
      loadingTimeSync: this.loadingTimeSync,
      state: this.isEnabled && this.backgroundModule.getState && this.backgroundModule.getState(),
    };
  }

  action(name, ...args) {
    return inject.module(this.name).action(name, ...args);
  }
}
