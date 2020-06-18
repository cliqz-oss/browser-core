/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Logger from '../logger';
import { ModuleMissingError, ModuleDisabledError, ActionMissingError } from '../app/module-errors';

let app;
/**
 * Given the promise resulting from a call to `action`, ignore errors resulting
 * from a disabled module. This can be especially useful during extension
 * restart when modules are stopped in arbitrary order and some actions might
 * fail.
 */
export function ifModuleEnabled(promise) {
  return promise.catch((err) => {
    if (err instanceof ModuleDisabledError) {
      Logger.get('core').debug(
        'Ignoring disabled module exception while calling action,'
        + ' the following exception can be safely ignored. This log'
        + ' is only printed in "debug" mode.', err
      );
      return Promise.resolve();
    }

    // Re-emit the same error if the cause is not `ModuleDisabledError`
    return Promise.reject(err);
  });
}

class ModuleWrapper {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }

  get module() {
    return app && app.modules[this.moduleName];
  }

  isPresent() {
    return !!this.module;
  }

  isReady() {
    if (!this.module) {
      return Promise.reject(new ModuleMissingError(this.moduleName));
    }

    if (this.module.isDisabled) {
      return Promise.reject(new ModuleDisabledError(this.moduleName));
    }

    return this.module.isReady();
  }

  isEnabled() {
    return !!(this.module && !this.module.isDisabled);
  }

  async action(actionName, ...args) {
    await this.isReady();
    const action = this.module.background.actions[actionName];
    if (!action) {
      throw new ActionMissingError(this.module.name, actionName);
    }
    return action(...args);
  }
}

export default {
  /**
   * Gets a module wrapper.
   * @param {string} -  moduleName Name of the module to be injected
   */
  get app() {
    return {
      get version() {
        return app.version;
      },
    };
  },
  module(moduleName) {
    return new ModuleWrapper(moduleName);
  },
  service: (serviceName, props = []) => props.reduce((curr, prop) => ({ ...curr,
    [prop]: (...args) => {
      const api = (app && app.services[serviceName] && app.services[serviceName].api);
      if (!api) {
        throw new Error(`Service "${serviceName}" is not available. Make sure it appears
        in the "requiresServices" property of the module's background where is it used.`);
      }
      if (!api[prop]) {
        throw new Error(`Could not access '${prop}' from service: ${serviceName}.`);
      }
      return api[prop](...args);
    } }), {}),
};

export function setGlobal(cliqzApp) {
  app = cliqzApp;
}


/**
 * To be used together with core/kord/inject
 * Calling an action of disabled or missing module
 * results in promise rejects. This helper function
 * generates a promise error callback that will
 * resolve to fixed value in those cases.
 *
 * Example:
 *
 *   inject.module('freshtab').action('getConfig')
 *     .catch(actionFallback({}));
 */
export const actionFallback = fallbackValue => (error) => {
  if (error instanceof ModuleDisabledError || error instanceof ModuleMissingError) {
    return fallbackValue;
  }
  throw error;
};

export const getModuleList = () => {
  if (!app) {
    return [];
  }
  return app.moduleList;
};
