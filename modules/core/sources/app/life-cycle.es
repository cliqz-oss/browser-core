/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Defer from '../helpers/defer';
import EventEmitter from '../event-emitter';
import { ModuleDisabledError } from './module-errors';

export const lifecycleEvents = {
  enabled: 'enabled',
  disabled: 'disabled',
};

const AppStates = Object.freeze({
  NOT_INITIALIZED: Symbol('NOT_INITIALIZED'),
  ENABLING: Symbol('ENABLING'),
  ENABLED: Symbol('ENABLED'),
  DISABLED: Symbol('DISABLED'),
});

const noLogger = {
  error: () => {},
  log: () => {},
};

export default class LifeCycle extends EventEmitter {
  constructor(name, logger) {
    super();

    // Information about loaded module
    this.name = name;
    this.logger = logger || noLogger;

    // Loading statistics
    this.loadingTime = 0;
    this.loadingTimeSync = 0;

    // Current state
    this._bgReadyDefer = new Defer();
    this._state = AppStates.NOT_INITIALIZED;
  }

  // Life-cycle hooks to init (async) and unload (sync).
  _init() {
    throw new Error('"_init" is not implemented');
  }

  _unload() {
    throw new Error('"_unload" is not implemented');
  }

  /**
    * Returns a `Promise` reflecting the current state of module's readiness. It is:
    * - pending if module is in not initialized yet or it is still initializing,
    * - resolved if module is "enabled" and successfully initialized,
    * - rejected if module is "disabled" or failed to initialize.
    *
    * Note: this promise MAY CHANGE, because module can be enabled or disabled at any time.
    * But we guarantee that if module is in any terminal state (i. e. "enabled" or "disabled")
    * then any promise ever returned by this method will be either resolved or rejected.
   */
  isReady() {
    return this._bgReadyDefer.promise;
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

  _markAsEnabling() {
    this._state = AppStates.ENABLING;
    if (this._bgReadyDefer.isSettled) {
      // Create new `_bgReadyDefer` if current one is already settled for any reason,
      // reuse existing one otherwise.
      this._bgReadyDefer = new Defer();
    }
  }

  _markAsEnabled() {
    this._state = AppStates.ENABLED;
    // In `_markAsEnabling` we already made sure this._bgReadyDefer.promise is not yet settled
    this._bgReadyDefer.resolve();
    this.emit(lifecycleEvents.enabled);
  }

  _markAsDisabled(e) {
    const reason = e || new ModuleDisabledError(this.name);
    this._state = AppStates.DISABLED;
    if (this._bgReadyDefer.state === Defer.RESOLVED) {
      // Create new `_bgReadyDefer` if current one is already resolved,
      // reuse existing one otherwise.
      this._bgReadyDefer = new Defer();
    }
    this.loadingTime = null;
    this.loadingTimeSync = null;

    this._bgReadyDefer.reject(reason);
    this.emit(lifecycleEvents.disabled);
  }

  /**
   * Enable the module if it is not yet enabled and not already enabling at this moment.
   *
   * Module is in ENABLING state during its initialization and then transitions to
   * either ENABLED (if initialization succeeds) or DISABLED (if it fails).
   *
   * Note: this method doesn't flip `modules.<moduleName>.enabled` pref
   * and does't start required services.
   * Check out `loadModule` and `enableModule` methods from `core/app`.
   */
  async enable(...args) {
    if (this.isEnabling || this.isEnabled) {
      this.logger.error('already loaded');
      return;
    }

    this.logger.log('starts loading');
    this._markAsEnabling();
    const loadingStartedAt = Date.now();
    try {
      const initPromise = this._init(...args);
      this.loadingTimeSync = Date.now() - loadingStartedAt;

      await initPromise;
      this.loadingTime = Date.now() - loadingStartedAt;

      this.logger.log('loaded', this.loadingTime);
      this._markAsEnabled();
    } catch (e) {
      this._markAsDisabled(e);
      throw e;
    }
  }

  /**
   * Disable the module if it is not already disabled by calling its `unload` method.
   * If module is still enabling it waits until it finishes before disabing it.
   */
  async disable() {
    if (this.isDisabled) {
      return;
    }

    if (this.isEnabling) {
      await this.isReady();
    }

    if (this.isEnabled) {
      this.logger.log('starts unloading');
      try {
        this._unload(); // no await: by convention, `unload` is a sync function
      } catch (ex) {
        this.logger.error('exception while unloading', ex);
      }
      this.logger.log('unloaded');
    }

    this._markAsDisabled();
  }
}
