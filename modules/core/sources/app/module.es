import { Window } from '../../platform/browser';
import console from '../console';
import modules from './modules';

function prepareBackgroundReadyPromise() {
  this.backgroundReadyPromise = new Promise((resolve, reject) => {
    this.backgroundReadyPromiseResolver = resolve;
    this.backgroundReadyPromiseRejecter = reject;
  });
}

export default class Module {
  constructor(name, settings) {
    this.name = name;
    this.isEnabled = false;
    this.isLoading = false;
    this.loadingTime = null;
    this.settings = settings;
    this.windows = Object.create(null);
    prepareBackgroundReadyPromise.call(this);
  }

  isReady() {
    return this.backgroundReadyPromise;
  }

  preload() {
    this.isLoading = true;
  }

  get backgroundModule() {
    return modules[this.name].Background;
  }

  get windowModule() {
    return modules[this.name].Window;
  }

  enable() {
    console.log('Module', this.name, 'start loading');
    const loadingStartedAt = Date.now();
    if (this.isEnabled) {
      throw new Error('Module already enabled');
    }
    if (!this.isLoading) {
      throw new Error('Module not flagged as loading');
    }
    return Promise.resolve(this.backgroundModule)
      .then((background) => {
        this.background = background;
        return background.init(this.settings);
      })
      .then(() => {
        this.isEnabled = true;
        this.loadingTime = Date.now() - loadingStartedAt;
        console.log('Module: ', this.name, ' -- Background loaded');
        this.backgroundReadyPromiseResolver();
      })
      .catch((e) => {
        this.backgroundReadyPromiseRejecter(e);
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
      this.isEnabled = false;
      this.isLoading = false;
      this.loadingTime = null;
      prepareBackgroundReadyPromise.call(this);
    }
    console.log('Module', this.name, 'unloading finished');
  }

  /**
   * return window module
   */
  loadWindow(window) {
    if (!this.isLoading) {
      return Promise.reject('cannot load window of disabled module');
    }
    let resolver;
    let rejecter;
    const loadingPromise = new Promise((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });
    const win = new Window(window);

    if (this.windows[win.id]) {
      console.log('Module window:', `"${this.name}"`, 'already loaded');
      return Promise.resolve();
    }
    const mutWindow = window;
    mutWindow.CLIQZ.Core.windowModules[this.name] = true;

    this.windows[win.id] = {
      loadingPromise,
    };
    console.log('Module window:', `"${this.name}"`, 'loading started');

    const loadingStartedAt = Date.now();
    const settings = this.settings;
    return Promise.resolve(this.windowModule)
      .then(WindowModule => new WindowModule({
        settings,
        window,
        background: this.backgroundModule,
      }))
      .then((module) => {
        win.window.CLIQZ.Core.windowModules[this.name] = module;
        return this.isReady()
          .then(() => module.init())
          .then(() => module);
      })
      .then((windowModule) => {
        this.windows[win.id] = {
          loadingTime: Date.now() - loadingStartedAt,
        };
        win.window.CLIQZ.Core.windowModules[this.name] = windowModule;
        resolver();
      })
      .catch((e) => {
        rejecter(e);
        throw e;
      });
  }

  unloadWindow(window, { disable } = {}) {
    const win = new Window(window);
    const windowModule = window.CLIQZ.Core.windowModules[this.name];
    if (!windowModule) {
      return;
    }

    if (disable && windowModule.disable) {
      console.log('Module window', `"${this.name}"`, 'disabling');
      window.CLIQZ.Core.windowModules[this.name].disable();
    }
    console.log('Module window', `"${this.name}"`, 'unloading');
    window.CLIQZ.Core.windowModules[this.name].unload();
    delete win.window.CLIQZ.Core.windowModules[this.name];
    delete this.windows[win.id];
    console.log('Module window', `"${this.name}"`, 'unloading finished');
  }

  status() {
    return {
      isEnabled: this.isEnabled,
    };
  }
}
