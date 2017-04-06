import { Window } from '../browser';

let app;

export class ModuleMissingError extends Error {
  constructor(moduleName) {
    super();
    this.name = 'ModuleMissingError';
    this.message = `module '${moduleName}' is missing`;
  }
}

export class ModuleDisabledError extends Error {
  constructor(moduleName) {
    super();
    this.name = 'ModuleDisabledError';
    this.message = `module '${moduleName}' is disabled`;
  }
}

class ModuleWrapper {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }

  isWindowReady(window) {
    const win = new Window(window);
    return this.isReady().then(() => {
      const module = app.availableModules[this.moduleName];
      return module.windows[win.id].loadingPromise;
    });
  }

  isReady() {
    const module = app.availableModules[this.moduleName];

    if (!module) {
      return Promise.reject(new ModuleMissingError(this.moduleName));
    }

    if (!module.isEnabled && !module.isLoading) {
      return Promise.reject(new ModuleDisabledError(this.moduleName));
    }

    return module.isReady();
  }

  action(actionName, ...args) {
    return this.isReady()
      .then(() => {
        const module = app.availableModules[this.moduleName];
        return module.background.actions[actionName](...args);
      });
  }

  windowAction(window, actionName, ...args) {
    return this.isWindowReady(window).then(() => {
      const module = window.CLIQZ.Core.windowModules[this.moduleName];
      const action = module.actions[actionName];
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
