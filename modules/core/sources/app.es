import System from 'system';
import config from './config';
import console from './console';
import utils from './utils';
import events, { subscribe } from './events';
import prefs from './prefs';
import Module from './app/module';
import { setGlobal } from './kord';
import { mapWindows, forEachWindow, addWindowObserver,
  removeWindowObserver, reportError, mustLoadWindow, setInstallDatePref,
  setOurOwnPrefs, resetOriginalPrefs, enableChangeEvents,
  disableChangeEvents, waitWindowReady } from '../platform/browser';

function shouldEnableModule(name) {
  const pref = `modules.${name}.enabled`;
  return !prefs.has(pref) || prefs.get(pref) === true;
}

export default class {

  constructor({ version, extensionId }) {
    this.version = version;
    this.extensionId = extensionId;
    this.priorityModulesLoaded = false;
    this.availableModules = config.modules.reduce((hash, moduleName) => {
      hash[moduleName] = new Module(
        moduleName,
        Object.assign({}, config.settings, { version })
      );
      return hash;
    }, Object.create(null));

    utils.app = this;
    utils.extensionVersion = version;
    setGlobal(this);
    this.prefchangeEventListener = subscribe('prefchange', this.onPrefChange, this);
  }

  extensionRestart(changes) {
    // unload windows
    forEachWindow(win => {
      if (win.CLIQZ && win.CLIQZ.Core) {
        this.unloadWindow(win);
      }
    });

    // unload background
    this.unload();

    // apply changes
    if (changes) {
      changes();
    }

    // load background
    return this.load().then(() => {
      // load windows
      const corePromises = [];
      forEachWindow(win => {
        corePromises.push(this.loadWindow(win));
      });
      return Promise.all(corePromises);
    });
  }

  unloadFromWindow(win, data) {
    // unload core even if the window closes to allow all modules to do their cleanup
    if (!mustLoadWindow(win)) {
      return;
    }

    try {
      this.unloadWindow(win, data);
      // count the number of opened windows here and send it to events
      // if the last window was closed then remaining == 0.
      let remainingWin = 0;
      forEachWindow(() => {
        remainingWin += 1;
      });
      events.pub('core.window_closed', { remaining: remainingWin });
    } catch (e) {
      reportError(e);
    }
  }

  loadIntoWindow(win) {
    if (!win) return;

    waitWindowReady(win)
      .then(() => {
        if (!mustLoadWindow(win)) {
          return Promise.reject();
        }
        return this.modulesLoadedPromise;
      })
      .then(() => {
        utils.log('Extension CLIQZ App background loaded');
        return this.loadWindow(win);
      }, () => { /* do nothin for non browser.xul windows */ })
      .catch(e => {
        utils.log(e, 'Extension filed loaded window modules');
      });
  }

  start() {
    // Load Config - Synchronous!
    utils.FEEDBACK_URL = `${utils.FEEDBACK}${this.version}-${config.settings.channel}`;

    this.modulesLoadedPromise = this.load()
      .then(() => {
        enableChangeEvents();

        this.windowWatcher = (win, event) => {
          if (event === 'opened') {
            this.loadIntoWindow(win);
          } else if (event === 'closed') {
            this.unloadFromWindow(win);
          }
        };

        addWindowObserver(this.windowWatcher);

        // Load into currently open windows
        forEachWindow(win => {
          this.loadIntoWindow(win);
        });
      })
      .catch(e => {
        utils.log(e, 'Extension -- failed to init CLIQZ App');
      });
  }

  stop(isShutdown, disable, telemetrySignal) {
    utils.telemetry({
      type: 'activity',
      action: telemetrySignal,
    }, true /* force push */);

    /**
     *
     *  There are different reasons on which extension does shutdown:
     *  https://developer.mozilla.org/en-US/Add-ons/Bootstrapped_extensions#Reason_constants
     *
     *  We handle them differently:
     *  * APP_SHUTDOWN - nothing need to be unloaded as browser shutdown, but
     *      there may be data that we may like to persist
     *  * ADDON_DISABLE, ADDON_UNINSTALL - full cleanup + bye bye messages
     *  * ADDON_UPGRADE, ADDON_DOWNGRADE - fast cleanup
     *
     */

    if (isShutdown) {
      this.unload({ quick: true });
      return;
    }

    // Unload from any existing windows
    forEachWindow(w => {
      this.unloadFromWindow(w, { disable });
    });

    this.unload();

    if (disable) {
      this.restorePrefs();
    }

    removeWindowObserver(this.windowWatcher);

    disableChangeEvents();

    this.prefchangeEventListener = subscribe('prefchange', this.onPrefChange, this);
  }

  modules({ type } = {}) {
    let modules;
    if (type === 'priority' ) {
      modules = this.priorityModules;
    } else if (type === 'nonpriority') {
      modules = this.nonPriorityModules;
    } else {
      modules = this.priorityModulesLoaded ? this.nonPriorityModules : this.priorityModules;
    }
    return modules.map(
      moduleName => this.availableModules[moduleName]
    );
  }

  get priorityModules() {
    return config.priority;
  }

  get nonPriorityModules() {
    return Object.keys(this.availableModules)
      .filter((m) => config.priority.indexOf(m) === -1);
  }

  enabledModules() {
    return config.modules.map(name => this.availableModules[name]).filter(module => module.isEnabled);
  }

  setupPrefs() {
    setInstallDatePref(this.extensionId);

    if (config.environment === 'development') {
      prefs.set('developer', true);
    }

    // Ensure prefs are set to our custom values
    /** Change some prefs for a better cliqzperience -- always do a backup! */
    setOurOwnPrefs();

    if ('default_prefs' in config) {
      Object.keys(config.default_prefs).forEach(pref => {
        if (!prefs.has(pref)) {
          console.log('App', 'set up preference', `"${pref}"`);
          prefs.set(pref, config.default_prefs[pref]);
        }
      });
    }
  }

  restorePrefs() {
    resetOriginalPrefs();
  }

  load() {
    console.log('App', 'Loading modules started');
    this.setupPrefs();
    const backgroundPromises = this.modules()
      .map(module => {

        if (shouldEnableModule(module.name)) {
          try {
            if (module.isEnabled) {
              return Promise.resolve();
            }
            return module.enable()
              .catch(e => console.error('App', 'Error on loading module:', module.name, e));
          } catch (e) {
            console.error('App module:', `"${module.name}"`, ' -- something went wrong', e);
            return Promise.resolve();
          }
        } else {
          module.isLoading = false;
          module.isEnabled = false;
          // TODO: should not be here
          return System.import(`${module.name}/background`);
        }
      });

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

    this.priorityModulesLoaded = false;
  }

  loadWindow(window) {
    // TODO: remove CLIQZ from window
    if(!window.CLIQZ){
      const CLIQZ = {
        app: this,
        System,
        Core: {
          windowModules: {},
        }, // TODO: remove and all clients
      };
      Object.defineProperty(window, 'CLIQZ', {
        configurable: true,
        value: CLIQZ,
      });
    }

    const windowModulePromises = this.modules({ type: (window.CLIQZ.priorityModulesLoaded ? 'nonpriority' : 'priority') }).map(module => {
      if (!module.isEnabled) {
        return Promise.resolve();
      }
      return module.loadWindow(window)
        .catch(e => {
          console.error('App window', `Error loading module: ${module.name}`, e);
        });
    });

    return Promise.all(windowModulePromises).then(() => {
      if (window.CLIQZ.priorityModulesLoaded) {
        return Promise.resolve();
      }
      window.CLIQZ.priorityModulesLoaded = true;
      this.priorityModulesLoaded = true;
      return this.load().then(() => {
        return this.loadWindow(window);
      }).then(() => {
        console.log('App', 'Window loaded');
        this.isFullyLoaded = true;
      });
    });
  }

  unloadWindow(window, data) {
    console.log('App window', 'unload window modules');
    this.enabledModules().reverse().forEach(module => {
      try {
        module.unloadWindow(window, data);
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

    const isEnabled = prefs.get(pref);
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

    return module.enable().then(() =>
      Promise.all(
        mapWindows(module.loadWindow.bind(module))
      ).then(() => {
        prefs.set(`modules.${moduleName}.enabled`, true);
      })
    );
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
    return Promise.resolve();
  }
}
