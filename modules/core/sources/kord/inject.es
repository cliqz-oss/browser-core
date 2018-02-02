import console from '../console';

let app;

export class ModuleMissingError extends Error {
  constructor(moduleName) {
    super(`module '${moduleName}' is missing`);
    this.name = 'ModuleMissingError';
  }
}

export class ModuleDisabledError extends Error {
  constructor(moduleName) {
    super(`module '${moduleName}' is disabled`);
    this.name = 'ModuleDisabledError';
  }
}

/**
 * Given the promise resulting from a call to `action`, ignore errors resulting
 * from a disabled module. This can be especially useful during extension
 * restart when modules are stopped in arbitrary order and some actions might
 * fail.
 */
export function ifModuleEnabled(promise) {
  return promise.catch((err) => {
    if (err.name === ModuleDisabledError.name) {
      console.debug(
        'Ignoring disabled module exception while calling action,' +
        ' the following exception can be safely ignored. This log' +
        ' is only printed in "debug" mode.', err);
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

  isWindowReady(window) {
    return this.isReady().then(() => this.module.getWindowLoadingPromise(window));
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

  action(actionName, ...args) {
    return this.isReady()
      .then(() => this.module.background.actions[actionName](...args));
  }

  windowAction(window, actionName, ...args) {
    return this.isWindowReady(window).then(() => {
      const windowModule = this.module.getWindowModule(window);
      const action = windowModule.actions[actionName];
      return Promise.resolve(action(...args));
    });
  }
}

export default {
  /**
   * Gets a module wrapper.
   * @param {string} -  moduleName Name of the module to be injected
   */
  module(moduleName) {
    return new ModuleWrapper(moduleName);
  },
};

export function setGlobal(cliqzApp) {
  app = cliqzApp;
}
