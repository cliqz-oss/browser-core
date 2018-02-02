import console from '../console';
import modules from './modules';
import DefaultWeakMap from './default-weak-map';
import Defer from './defer';
import Service from './service';
import inject from '../kord/inject';
import { Window } from '../../platform/browser';
import EventEmitter from '../event-emitter';

export const lifecycleEvents = {
  enabled: 'enabled',
  disabled: 'disabled',
};
const eventNames = Object.keys(lifecycleEvents).map(k => lifecycleEvents[k]);

export default class Module extends EventEmitter {
  constructor(name, settings) {
    super(eventNames);
    this.name = name;
    this.loadingTime = null;
    this.settings = settings;
    this._bgReadyDefer = new Defer();
    this._state = 'disabled';
    this._stat = {
      init: 0,
      load: 0
    };
    this._windows = new DefaultWeakMap(() => ({
      windowModule: null,
      loadingDefer: new Defer(),
      loadingTime: null,
      loadingStarted: false
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

  get isEnabled() {
    return this._state === 'enabled';
  }

  get isEnabling() {
    return this._state === 'enabling';
  }

  get isDisabled() {
    return this._state === 'disabled';
  }

  markAsEnabling() {
    this._state = 'enabling';
  }

  enable(app = null) {
    console.log('Module', this.name, 'start loading');
    const loadingStartedAt = Date.now();
    return Promise.resolve(this.backgroundModule)
      .then((background) => {
        this.background = background;
        return background.init(this.settings, app);
      })
      .then(() => {
        this._state = 'enabled';
        this.loadingTime = Date.now() - loadingStartedAt;
        console.log('Module: ', this.name, ' -- Background loaded');
        this._bgReadyDefer.resolve();
        this.emit(lifecycleEvents.enabled);
      })
      .catch((e) => {
        this._state = 'disabled';
        this._bgReadyDefer.reject();
        throw e;
      });
  }

  disable({ quick } = { quick: false }) {
    console.log('Module', this.name, 'start unloading');
    const background = this.background;

    if (quick) {
      // background does not need to have beforeBrowserShutdown defined
      const quickShutdown = background.beforeBrowserShutdown ||
        function beforeBrowserShutdown() {};
      quickShutdown.call(background);
    } else {
      background.unload();
      this._state = 'disabled';
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
      return Promise.reject('cannot load window of disabled module');
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

  unloadWindow(window, { disable } = {}) {
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
  }

  status() {
    return {
      isEnabled: this.isEnabled,
    };
  }

  action(name, ...args) {
    return inject.module(this.name).action(name, ...args);
  }

  windowAction(window, name, ...args) {
    return inject.module(this.name).windowAction(window, name, ...args);
  }
}
