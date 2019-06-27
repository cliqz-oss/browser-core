/* eslint no-param-reassign: 'off' */

import console from '../console';
import modules from './modules';
import DefaultMap from '../helpers/default-map';
import Defer from '../helpers/defer';
import Service from './service';
import inject from '../kord/inject';
import { Window, mapWindows } from '../../platform/browser';
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

class DefaultWindowMap extends DefaultMap {
  get(_key) {
    const key = this._getKey(_key);
    return super.get(key);
  }

  delete(_key) {
    const key = this._getKey(_key);
    return super.delete(key);
  }

  _getKey(window) {
    return new Window(window).id;
  }
}

export default class Module extends EventEmitter {
  constructor(name, settings = {}) {
    super(eventNames);
    this.name = name;
    this.loadingTime = 0;
    this.loadingTimeSync = 0;
    this.settings = settings;
    this._bgReadyDefer = new Defer();
    this._state = AppStates.NOT_INITIALIZED;
    this._stat = {
      init: 0,
      load: 0
    };
    this._windows = new DefaultWindowMap(() => ({
      windowModule: null,
      loadingDefer: new Defer(),
      loadingTime: 0,
      loadingStarted: 0,
    }));
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

  get backgroundModule() {
    return modules[this.name].Background;
  }

  get WindowModule() {
    return modules[this.name].Window;
  }

  get isOnionReady() {
    return !!modules[this.name].isOnionReady;
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
    this._state = AppStates.ENABLING;
  }

  markAsDisabled() {
    this._state = AppStates.DISABLED;
    this._bgReadyDefer.reject(new ModuleDisabledError(this.name));
  }

  enable(app = null) {
    console.log('Module', this.name, 'start loading');
    this.markAsEnabling();
    const loadingStartedAt = Date.now();
    return Promise.resolve(this.backgroundModule)
      .then((background) => {
        this.background = background;
        const loadingSyncStartedAt = Date.now();
        const initPromise = background.init(this.settings, app);
        this.loadingTimeSync = Date.now() - loadingSyncStartedAt;
        return initPromise;
      })
      .then(() => {
        this._state = AppStates.ENABLED;
        this.loadingTime = Date.now() - loadingStartedAt;
        console.log('Module: ', this.name, ' -- Background loaded');
        this._bgReadyDefer.resolve();
        this.emit(lifecycleEvents.enabled);
      })
      .catch((e) => {
        this._state = AppStates.DISABLED;
        this._bgReadyDefer.reject(e);
        throw e;
      });
  }

  disable({ quick } = { quick: false }) {
    console.log('Module', this.name, 'start unloading');
    const background = this.background;

    // TODO: remove quick disable because it's not needed anymore
    // TODO: remove quick disable usages
    if (quick) {
      // background does not need to have beforeBrowserShutdown defined
      const quickShutdown = background.beforeBrowserShutdown
        || function beforeBrowserShutdown() {};
      quickShutdown.call(background);
    } else {
      background.unload();
      this._state = AppStates.DISABLED;
      this.loadingTime = null;
      this._bgReadyDefer = new Defer();
    }
    console.log('Module', this.name, 'unloading finished');
    this.emit(lifecycleEvents.disabled);
  }

  /**
   * return window module
   */
  loadWindow(window) {
    if (this.isDisabled) {
      return Promise.reject(new Error('cannot load window of disabled module'));
    }
    const windowModuleState = this._windows.get(window);
    const { loadingDefer, loadingStarted } = windowModuleState;
    if (loadingStarted) {
      console.log('Module window:', `"${this.name}"`, 'already being loaded');
      return loadingDefer.promise;
    }

    console.log('Module window:', `"${this.name}"`, 'loading started');
    windowModuleState.loadingStarted = true;
    const loadingStartedAt = Date.now();
    let initStartedAt;
    return Promise.all([
      new this.WindowModule({
        settings: this.settings,
        window,
        windowId: (new Window(window)).id,
        background: this.backgroundModule,
      }),
      this.isReady()
    ])
      .then(([windowModule]) => {
        initStartedAt = Date.now();
        windowModuleState.windowModule = windowModule;
        return windowModule.init();
      })
      .then(() => {
        windowModuleState.initTime = Date.now() - initStartedAt;
        windowModuleState.loadingTime = Date.now() - loadingStartedAt;
        this._stat.init += windowModuleState.initTime;
        this._stat.load += windowModuleState.loadingTime;
        console.log('Module window:', `"${this.name}"`, 'loading finished');
        loadingDefer.resolve();
        return loadingDefer.promise;
      })
      .catch((e) => {
        loadingDefer.reject(e);
        throw e;
      });
  }

  getWindowModule(window) {
    return this._windows.get(window).windowModule;
  }

  getWindowLoadingPromise(window) {
    return this._windows.get(window).loadingDefer.promise;
  }

  getLoadingTime(window) {
    return this._windows.get(window).loadingTime;
  }

  getInitTime(window) {
    return this._windows.get(window).initTime;
  }

  unloadWindow = (window, { disable } = {}) => {
    const windowModule = this.getWindowModule(window);
    if (!windowModule) {
      return;
    }

    if (disable && windowModule.disable) {
      console.log('Module window', `"${this.name}"`, 'disabling');
      windowModule.disable();
    }

    console.log('Module window', `"${this.name}"`, 'unloading');
    windowModule.unload();
    this._windows.delete(window);
    console.log('Module window', `"${this.name}"`, 'unloading finished');
  };

  status() {
    const windowWrappers = mapWindows(window => new Window(window));
    const windows = windowWrappers.reduce((_hash, win) => {
      _hash[win.id] = {
        loadingTime: this.getLoadingTime(win.window),
      };
      return _hash;
    }, Object.create(null));
    return {
      name: this.name,
      isEnabled: this.isEnabled || this.isEnabling,
      loadingTime: this.loadingTime,
      loadingTimeSync: this.loadingTimeSync,
      windows,
      state: this.isEnabled && this.backgroundModule.getState && this.backgroundModule.getState(),
    };
  }

  action(name, ...args) {
    return inject.module(this.name).action(name, ...args);
  }

  windowAction(window, name, ...args) {
    return inject.module(this.name).windowAction(window, name, ...args);
  }
}
