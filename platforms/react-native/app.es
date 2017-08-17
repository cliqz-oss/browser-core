import config from '../core/config';
import console from '../core/console';
import { subscribe } from '../core/events';
import prefs from '../core/prefs';
import { Window, mapWindows, forEachWindow } from './browser';
import utils from '../core/utils';

import coreBG from '../core/background';
import attrackBG from '../antitracking/background';
import adblockBG from '../adblocker/background';
import attrackBlockerBG from '../antitracking-blocker/background';

const backgrounds = {
  core: coreBG,
  antitracking: attrackBG,
  adblocker: adblockBG,
  'antitracking-blocker': attrackBlockerBG,
};

function shouldEnableModule(name) {
  const pref = `modules.${name}.enabled`;
  return !prefs.has(pref) || prefs.get(pref) === true;
}

export default class {
  constructor() {
    this.availableModules = config.modules.reduce((hash, moduleName) => {
      hash[moduleName] = new Module(moduleName);
      return hash;
    }, Object.create(null));
    utils.app = this;
  }

  modules() {
    return Object.keys(this.availableModules)
      .map(
        moduleName => this.availableModules[moduleName]
      );
  }

  enabledModules() {
    return this.modules().filter(module => module.isEnabled);
  }

  setDefaultPrefs() {
    if ('default_prefs' in config) {
      Object.keys(config.default_prefs).forEach(pref => {
        if (!prefs.has(pref)) {
          console.log('App', 'set up preference', `"${pref}"`);
          prefs.set(pref, config.default_prefs[pref]);
        }
      });
    }
  }

  load() {
    console.log('App', 'Set up default parameters for new modules');
    this.setDefaultPrefs();
    console.log('App', 'Loading modules started');
    const backgroundPromises = this.modules()
      .map(module => {
        if (shouldEnableModule(module.name)) {
          try {
            return module.enable()
              .catch(e => console.error('App', 'Error on loading module:', module.name, e));
          } catch (e) {
            console.error('App module:', `"${module.name}"`, ' -- something went wrong', e);
            return Promise.resolve();
          }
        } else {
          // TODO: should not be here
          // return System.import(module.name + '/background');
        }
      });

    this.prefchangeEventListener = subscribe('prefchange', this.onPrefChange, this);

    return Promise.all(backgroundPromises).then(() => {
      console.log('App', 'Loading modules -- all background loaded');
    }).catch(e => {
      console.error('App', 'Loading modules failed', e);
    });
  }

  unload({ quick } = { quick: false }) {
    this.prefchangeEventListener.unsubscribe();

    console.log('App', 'unload background modules');
    this.enabledModules().reverse().forEach(module => {
      try {
        console.log('App', 'unload background module: ', module.name);
        module.disable({ quick });
      } catch (e) {
        console.error(`Error unloading module: ${module.name}`, e);
      }
    });
    console.log('App', 'unload background modules finished');
  }

  loadWindow(window) {
    return Promise.resolve();
    // const CLIQZ = {
    //   System,
    //   Core: {
    //     windowModules: {},
    //   }, // TODO: remove and all clients
    // };

    // // TODO: remove CLIQZ from window
    // Object.defineProperty(window, 'CLIQZ', {
    //   configurable: true,
    //   value: CLIQZ,
    // });

    // const windowModulePromises = this.enabledModules().map(module => {
    //   console.log('App window', 'loading module', `"${module.name}"`, 'started');
    //   return module.loadWindow(window)
    //     .catch(e => {
    //       console.error('App window', `Error loading module: ${module.name}`, e);
    //     });
    // });

    // return Promise.all(windowModulePromises).then(() => {
    //   console.log('App', 'Window loaded');
    // });
  }

  unloadWindow(window) {
    console.log('App window', 'unload window modules');
    this.enabledModules().reverse().forEach(module => {
      try {
        module.unloadWindow(window);
      } catch (e) {
        console.error('App window', `error on unload module ${module.name}`, e);
      }
    });
    /* eslint-disable */
    delete window.CLIQZ;
    /* eslint-enable */
  }

  onPrefChange(pref) {
    if (!pref.startsWith('modules.')) {
      return;
    }

    const prefParts = pref.split('.');
    if (prefParts.pop() !== 'enabled') {
      return;
    }

    const isEnabled = prefs.get(pref) === true;
    const moduleName = prefParts.pop();
    const module = this.availableModules[moduleName];

    if (!module) {
      // pref for non-existing module - just ignore
      return;
    }

    if (isEnabled === true && !module.isEnabled) {
      this.enableModule(module.name);
    } else if (isEnabled === false && module.isEnabled) {
      this.disableModule(module.name);
    } else {
      // prefchange tends to fire with no change - just ignore
    }
  }

  // use in runtime not startup
  enableModule(moduleName) {
    const module = this.availableModules[moduleName];

    if (module.isEnabled) {
      return Promise.resolve();
    }

    module.isLoading = true;
    return module.enable().then(() => {
      return Promise.all(
        mapWindows(module.loadWindow.bind(module))
      ).then(() => {
        prefs.set(`modules.${moduleName}.enabled`, true);
      });
    });
  }

  // use in runtime not startup
  disableModule(moduleName) {
    const module = this.availableModules[moduleName];

    if (!module.isEnabled) {
      return Promise.resolve();
    }

    forEachWindow(module.unloadWindow.bind(module));
    module.disable();
    prefs.set(`modules.${moduleName}.enabled`, false);
  }
}

function prepareBackgroundReadyPromise() {
  this.backgroundReadyPromise = new Promise((resolve, reject) => {
    this.backgroundReadyPromiseResolver = resolve;
    this.backgroundReadyPromiseRejecter = reject;
  });
}

class Module {

  constructor(name) {
    this.name = name;
    this.isEnabled = false;
    this.isLoading = true;
    this.loadingTime = null;
    this.windows = Object.create(null);
    prepareBackgroundReadyPromise.call(this);
  }

  isReady() {
    return this.backgroundReadyPromise;
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
    const module = backgrounds[this.name];
    this.background = module;
    return module.init(config.settings)
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
    const background = backgrounds[this.name];

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
    return Promise.resolve();
    // console.log('Module window:', `"${this.name}"`, 'loading');
    // const loadingStartedAt = Date.now();
    // return System.import(`${this.name}/window`)
    //   .then(({ default: WindowModule }) =>
    //     new WindowModule({
    //       settings: config.settings,
    //       window,
    //     })
    //   )
    //   .then(module => {
    //     return Promise.resolve(module.init()).then(() => module);
    //   })
    //   .then(windowModule => {
    //     const win = new Window(window);
    //     this.windows[win.id] = {
    //       loadingTime: Date.now() - loadingStartedAt,
    //     };
    //     console.log('Module window:', `"${this.name}"`, 'loading finished');
    //     window.CLIQZ.Core.windowModules[this.name] = windowModule;
    //   });
  }

  unloadWindow(window) {
    const win = new Window(window);
    console.log('Module window', `"${this.name}"`, 'unloading');
    window.CLIQZ.Core.windowModules[this.name].unload();
    delete window.CLIQZ.Core.windowModules[this.name];
    delete this.windows[win.id];
    console.log('Module window', `"${this.name}"`, 'unloading finished');
  }

  status() {
    return {
      isEnabled: this.isEnabled,
    };
  }
}
