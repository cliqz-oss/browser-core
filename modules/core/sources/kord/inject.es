import Logger from '../logger';
import { ModuleMissingError, ModuleDisabledError } from '../app/module-errors';

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
    }).catch((e) => {
      Logger.get('core').error(`window action "${actionName}" for module "${this.module.name}" failed`, e);
      throw e;
    });
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
