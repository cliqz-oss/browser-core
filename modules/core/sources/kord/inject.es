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

class ModuleWrapper {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }

  get module() {
    return app.availableModules[this.moduleName];
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
