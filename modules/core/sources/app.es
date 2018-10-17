/* eslint no-param-reassign: 'off' */

import config from './config';
import events, { subscribe } from './events';
import prefs from './prefs';
import Module from './app/module';
import { setApp } from './kord';
import console, { enable as enableConsole, disable as disableConsole } from './console';
import Logger from './logger';
import utils from './utils';
import { Window, mapWindows, forEachWindow, addWindowObserver,
  removeWindowObserver, reportError, mustLoadWindow,
  setOurOwnPrefs, resetOriginalPrefs, enableChangeEvents,
  disableChangeEvents, waitWindowReady, addMigrationObserver, removeMigrationObserver,
  addSessionRestoreObserver, removeSessionRestoreObserver } from '../platform/browser';
import Defer from './helpers/defer';
import { getChannel } from '../platform/demographics';

export function shouldEnableModule(name) {
  const pref = `modules.${name}.enabled`;
  return !prefs.has(pref) || prefs.get(pref) === true;
}

function setupConsole() {
  if (prefs.get('showConsoleLogs')) {
    enableConsole();
    Logger.enable();
  } else {
    disableConsole();
    Logger.disable();
  }
}

/**
 * @module core
 * @namespace core
 */

/**
 * @class App
 */
export default class App {
  /**
   * @constructor
   * @param {object} config
   */
  constructor({ version, debug } = {}) {
    this.isFullyLoaded = false;

    /**
     * @property {string} version
     */
    this.version = version;
    this.debug = debug;
    /**
     * @property {object} config
     */
    this.config = config;
    /**
     * @property {object} modules
     */
    this.modules = Object.create(null);

    /**
     * @property {object} services
     */
    this.services = Object.create(null);

    /**
     * @property {WeakSet} loadedWindows
     */
    this.loadedWindows = new WeakSet();

    this._startedDefer = new Defer();

    config.modules.forEach((moduleName) => {
      const module = new Module(
        moduleName,
        Object.assign({}, config.settings, { version })
      );
      this.modules[moduleName] = module;

      // Keep reference to all module services by their name
      // Currently last one wins
      Object.assign(this.services, module.providedServices);
    });

    utils.extensionVersion = version;
    setApp(this);
    this.isRunning = false;
    this.onMigrationEnded = (_, topic) => {
      if (topic === 'Migration:Ended') {
        this.extensionRestart();
      }
    };
  }

  /**
   * should be used only for testing!
   *
   * @method extensionRestart
   * @param {function} changes - function called between stop and start
   */
  extensionRestart(changes) {
    // unload windows
    forEachWindow((win) => {
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
      forEachWindow((win) => {
        corePromises.push(this.loadWindow(win));
      });
      return Promise.all(corePromises);
    });
  }

  /**
   * @method unloadIntoWindow
   * @private
   */
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

  /**
   * @method loadIntoWindow
   * @private
   */
  loadIntoWindow(win, source) {
    console.log('window loading -> source:', source);
    if (!win) return;
    if (this.loadedWindows.has(win)) {
      console.log('window loading -> stop: already loaded');
      return;
    }
    this.loadedWindows.add(win);

    waitWindowReady(win) // This takes a lot to fulfill...
      .then(() => {
        if (mustLoadWindow(win)) {
          return this.loadWindow(win);
        }
        return null;
      })
      .catch((e) => {
        console.error(e, 'Extension failed loaded window modules');
      });
  }

  /**
   * Starts the Cliqz App.
   * Loads all required services, module backgrounds and module windows.
   * Setup window observer to load window module into all future windows.
   *
   * Modules that are marked as disabled will not be loaded. To mark a module
   * as disabled set a preference `modules.<moduleName>.enabled` to `false`.
   *
   * @method start
   * @returns {Promise}
   */
  async start() {
    this.isRunning = true;
    if (!config.settings.channel) { // mobile
      // for mobile, channel is set by native browser builds
      // so we need to override the config settings
      // TODO: get rid of all config.settings.channel dependencies
      // and use one source of channel
      config.settings.channel = await getChannel();
    }
    addMigrationObserver(this.onMigrationEnded);
    return this.setupPrefs().then(() =>
      this.load().then(() => {
        enableChangeEvents();
        this.windowWatcher = (win, event) => {
          if (event === 'opened') {
            this.loadIntoWindow(win, 'windowWatcher');
          } else if (event === 'closed') {
            this.unloadFromWindow(win);
          }
        };

        addWindowObserver(this.windowWatcher);

        // Load into currently open windows
        forEachWindow((win) => {
          this.loadIntoWindow(win, 'existing window');
        });

        this.sessionRestoreObserver = () => {
          // Load into all the open windows after session restore hits
          forEachWindow((win) => {
            this.loadIntoWindow(win, 'session restore');
          });
        };

        addSessionRestoreObserver(this.sessionRestoreObserver);
      })
    );
  }

  /**
   * Stops the Cliqz App
   *
   * @method stop
   * @params {boolean} isShutdown
   * @params {boolean} disable
   * @params {string} telemetrySignal
   */
  stop(isShutdown, disable, telemetrySignal) {
    this.isRunning = false;
    removeMigrationObserver(this.onMigrationEnded);
    // NOTE: Disable this warning locally since the solution is hacky anyway.
    /* eslint-disable no-param-reassign */

    utils.telemetry({
      type: 'activity',
      action: telemetrySignal,
      lifecyle: 'stop'
    }, true /* force push */);

    /*
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

    if (disable && config.settings.channel === '40') {
      // in the Cliqz browser the extension runns as a system addon and
      // the user cannot disable or uninstall it. Therefore we do not need
      // to consider an uninstall signal.
      //
      // we need this override to avoid an issue in FF52. Please check:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1351617
      //
      // TODO: find a nicer way to detect if this runs in the Cliqz browser
      disable = false;
    }

    if (isShutdown) {
      this.unload({ quick: true });
      return;
    }

    // Unload from any existing windows
    forEachWindow((w) => {
      this.unloadFromWindow(w, { disable });
    });

    this.unload();

    if (disable) {
      this.restorePrefs();
    }

    removeWindowObserver(this.windowWatcher);
    removeSessionRestoreObserver(this.sessionRestoreObserver);

    disableChangeEvents();
  }

  get moduleList() {
    const modules = this.modules;
    return Object.keys(modules).map(moduleName => modules[moduleName]);
  }

  enabledModules() {
    return config.modules
      .map(name => this.modules[name])
      .filter(module => module.isEnabled);
  }

  setupPrefs() {
    const initPrefs = prefs.init || Promise.resolve.bind(Promise);
    return initPrefs().then(() => {
      if (config.environment === 'development' || this.debug) {
        prefs.set('developer', true);
      }

      // Ensure prefs are set to our custom values
      /** Change some prefs for a better cliqzperience -- always do a backup! */
      setOurOwnPrefs(this.version);

      if ('default_prefs' in config) {
        Object.keys(config.default_prefs).forEach((pref) => {
          if (!prefs.has(pref)) {
            console.log('App', 'set up preference', `"${pref}"`);
            prefs.set(pref, config.default_prefs[pref]);
          }
        });
      }

      setupConsole();

      this.prefchangeEventListener = subscribe('prefchange', this.onPrefChange, this);
    });
  }

  restorePrefs() {
    resetOriginalPrefs();
  }

  prepareServices(serviceNames) {
    return Promise.all(
      serviceNames.map(
        // service is initialized only once, so calling init multiple times is fine
        serviceName => this.services[serviceName].init()
      )
    );
  }

  unloadServices() {
    Object.keys(this.services).forEach((serviceName) => {
      try {
        this.services[serviceName].unload();
      } catch (e) {
        console.log('App', 'error unloading service', e);
      }
    });
  }

  /**
   * Enable module and it dependant services
   * Module will not load if dependant services fail to initialize
   *
   * @method loadModule
   * @private
   */
  loadModule(module) {
    if (module.isEnabled || module.isEnabling) {
      console.log('App', 'loadModule', 'module already loaded');
      return module.isReady();
    }

    module.markAsEnabling();

    return this.prepareServices(module.requiredServices).then(
      () => module.enable(this)
        .catch(e => console.error('App', 'Error on loading module:', module.name, e)),
      e => console.error('App', 'Error on loading services', e)
    );
  }

  /**
   * Triggers module loading
   */
  load() {
    console.log('App', 'Loading modules started');
    const allModules = this.moduleList;
    const core = allModules.find(x => x.name === 'core');
    const modules = allModules.filter(x => x.name !== 'core' && shouldEnableModule(x.name));

    // we load core first before any other module
    return this.loadModule(core)
      // loading of modules should be paralellized as much as possible
      .then(() => {
        // do not return - we trigger module loading and let window loading to
        // start as soon as possible
        Promise.all(modules.map(x => this.loadModule(x)))
          .then(() => {
            console.log('App', 'Loading modules -- all loaded');
            this._startedDefer.resolve();
          })
          .catch((e) => {
            console.error('App', 'Loading modules failed', e);
            this._startedDefer.reject(e);
          });
      });
  }

  unload({ quick } = { quick: false }) {
    if (this.prefchangeEventListener) {
      this.prefchangeEventListener.unsubscribe();
    }

    console.log('App', 'unload background modules');
    this.enabledModules().reverse().forEach((module) => {
      try {
        console.log('App', 'unload background module: ', module.name);
        module.disable({ quick });
      } catch (e) {
        console.error(`Error unloading module: ${module.name}`, e);
      }
    });
    console.log('App', 'unload background modules finished');
    console.log('App', 'unload services');
    this.unloadServices();
    console.log('App', 'unload services finished');
  }

  loadWindow(window) {
    // TODO: remove Cliqz from window
    if (!window.CLIQZ) {
      const CLIQZ = {
        config,
        startedAt: Date.now(),
        app: this,
        Core: { }, // TODO: remove and all clients
      };

      Object.defineProperty(window, 'CLIQZ', {
        configurable: true,
        value: CLIQZ,
      });
    }

    const core = this.moduleList.find(x => x.name === 'core');
    const modules = this.moduleList.filter(x => x.name !== 'core' && !x.isDisabled);

    return core.loadWindow(window)
      .then(() => Promise.all(
        modules.map(
          mod => mod.loadWindow(window)
            .catch(e => console.error('App', 'error loading window module', mod.name, e))
        )
      ))
      .then(() => {
        console.log('App', 'Window loaded');
        const windowId = new Window(window).id;
        events.pub('app:window-loaded', { windowId });
        window.CLIQZ.loadedAt = Date.now();
        window.CLIQZ.loadingTime = window.CLIQZ.loadedAt - window.CLIQZ.startedAt;
        this.isFullyLoaded = true;
      })
      .catch((e) => {
        console.error('App window', 'Error loading (should not happen!)', e);
      });
  }

  unloadWindow(window, data) {
    console.log('App window', 'unload window modules');
    this.enabledModules().reverse().forEach((module) => {
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
    if (pref === 'showConsoleLogs') {
      setupConsole();
    }

    if (!pref.startsWith('modules.')) {
      return;
    }

    const prefParts = pref.split('.');
    if (prefParts.pop() !== 'enabled') {
      return;
    }

    const shouldEnable = prefs.get(pref) === true;
    const shouldDisable = !shouldEnable;
    const moduleName = prefParts.pop();
    const module = this.modules[moduleName];

    if (!module) {
      // pref for non-existing module - just ignore
      return;
    }

    if (shouldEnable && module.isDisabled) {
      this.enableModule(module.name);
    } else if (shouldDisable && !module.isDisabled) {
      this.disableModule(module.name);
    } else {
      // prefchange tends to fire with no change - just ignore
    }
  }

  /**
   * Enabled module background and then load into all windows.
   * Returns early if module is already enabled.
   *
   * It sets the `modules.<moduleName>.enabled` pref to true.
   *
   * @method enableModule
   * @params {string} moduleName - name of the module
   * @returns {Promise}
   */
  enableModule(moduleName) {
    const module = this.modules[moduleName];
    prefs.set(`modules.${moduleName}.enabled`, true);

    if (module.isEnabled || !this.isRunning) {
      return Promise.resolve();
    }

    // TODO: move this into the loadModule
    const moduleEnabled = module.isEnabling ? module.isReady() : this.loadModule(module);

    return moduleEnabled
      .then(() => Promise.all(
        mapWindows(module.loadWindow.bind(module))
      ));
  }

  /**
   * Disable module windows and then the background.
   * Does nothing if module is already disabled.
   *
   * It sets the `modules.<moduleName>.enabled` pref to false. So if called
   * before startup, it will prevent module start.
   *
   * It returns a Promsie but side effects synchronously.
   * If module did not finish initilizaton it waits and then disable it.
   *
   * @method disableModule
   * @param {string} moduleName - name of a module
   * @returns {Promise}
   */
  disableModule(moduleName) {
    const module = this.modules[moduleName];
    prefs.set(`modules.${moduleName}.enabled`, false);

    if (module.isDisabled || !this.isRunning) {
      return Promise.resolve();
    }

    const disable = () => {
      forEachWindow(module.unloadWindow);
      module.disable();
    };

    if (module.isEnabling) {
      return module.isReady().then(disable);
    }

    disable();

    return Promise.resolve();
  }

  ready() {
    return this._startedDefer.promise;
  }

  status() {
    const appModules = this.modules;
    const modules = Object.keys(appModules).reduce((hash, moduleName) => {
      const module = appModules[moduleName];
      hash[moduleName] = module.status();
      return hash;
    }, Object.create(null));
    return {
      modules,
    };
  }
}
