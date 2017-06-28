import config from './config';
import events, { subscribe } from './events';
import prefs from './prefs';
import Module from './app/module';
import { setGlobal } from './kord';
import console from './console';
import utils from './utils';
import { mapWindows, forEachWindow, addWindowObserver,
  removeWindowObserver, reportError, mustLoadWindow, setInstallDatePref,
  setOurOwnPrefs, resetOriginalPrefs, enableChangeEvents,
  disableChangeEvents, waitWindowReady } from '../platform/browser';

function shouldEnableModule(name) {
  const pref = `modules.${name}.enabled`;
  return !prefs.has(pref) || prefs.get(pref) === true;
}

export default class {

  constructor({ version, extensionId } = {}) {
    this.version = version;
    this.extensionId = extensionId;
    this.availableModules = Object.create(null);
    config.modules.forEach((moduleName) => {
      this.availableModules[moduleName] = new Module(
        moduleName,
        Object.assign({}, config.settings, { version })
      );
    });

    utils.app = this;
    utils.extensionVersion = version;
    setGlobal(this);
    this.prefchangeEventListener = subscribe('prefchange', this.onPrefChange, this);
  }

  // should be used only for testing!
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

    waitWindowReady(win) // This takes a lot to fulfill...
      .then(() => {
        if (mustLoadWindow(win)) {
          return this.loadWindow(win);
        }
        return null;
      })
      .catch((e) => {
        console.log(e, 'Extension filed loaded window modules');
      });
  }

  start() {
    // Load Config - Synchronous!
    utils.FEEDBACK_URL = `${utils.FEEDBACK}${this.version}-${config.settings.channel}`;

    this.load()
    .catch((e) => {
      utils.log(e, 'Extension -- failed to init CLIQZ App');
    });

    // TODO: could be nicer
    this.availableModules.core.isReady().then(() => {
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
      forEachWindow((win) => {
        this.loadIntoWindow(win);
      });
    });
  }

  stop(isShutdown, disable, telemetrySignal) {
    // NOTE: Disable this warning locally since the solution is hacky anyway.
    /* eslint-disable no-param-reassign */

    utils.telemetry({
      type: 'activity',
      action: telemetrySignal
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

    if (disable && config.settings.channel === '40') {
      // in the CLIQZ browser the extension runns as a system addon and
      // the user cannot disable or uninstall it. Therefore we do not need
      // to consider an uninstall signal.
      //
      // we need this override to avoid an issue in FF52. Please check:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1351617
      //
      // TODO: find a nicer way to detect if this runs in the CLIQZ browser
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

    disableChangeEvents();
  }

  modules() {
    const modules = this.availableModules;
    return Object.keys(modules).map(moduleName => modules[moduleName]);
  }

  enabledModules() {
    return config.modules
    .map(name => this.availableModules[name])
    .filter(module => module.isEnabled);
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
      Object.keys(config.default_prefs).forEach((pref) => {
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

  loadModule(module) {
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
  }

  load() {
    console.log('App', 'Loading modules started');
    this.setupPrefs();
    const allModules = this.modules();
    const core = allModules.find(x => x.name === 'core');
    const modules = allModules.filter(x => x.name !== 'core' && shouldEnableModule(x.name));

    core.preload();
    modules.forEach(x => x.preload());

    return this.loadModule(core)
    .then(() => Promise.all(modules.map(x => this.loadModule(x))))
    .then(() => {
      console.log('App', 'Loading modules -- all loaded');
    }).catch((e) => {
      console.error('App', 'Loading modules failed', e);
    });
  }

  unload({ quick } = { quick: false }) {
    this.prefchangeEventListener.unsubscribe();

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
  }

  loadWindow(window) {
    // TODO: remove CLIQZ from window
    if (!window.CLIQZ) {
      const CLIQZ = {
        app: this,
        Core: {
          windowModules: {},
        }, // TODO: remove and all clients
      };

      // legacy code for bootstrap addon - remove it when bundling is there
      if (typeof System === 'object') {
        CLIQZ.System = System;
      }

      Object.defineProperty(window, 'CLIQZ', {
        configurable: true,
        value: CLIQZ,
      });
    }

    const core = this.modules().find(x => x.name === 'core');
    const modules = this.modules().filter(x => x.name !== 'core');

    return core.loadWindow(window)
    .then(() => modules.filter(x => x.isLoading))
    .then(mods => Promise.all(
      mods.map(
        mod => mod.loadWindow(window)
          .catch(e => console.error('App', 'error loading window module', mod.name, e))
      )
    ))
    .then(() => {
      console.log('App', 'Window loaded');
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
  // TODO: check this is working fine with new module loading
  enableModule(moduleName) {
    const module = this.availableModules[moduleName];

    if (module.isEnabled) {
      return Promise.resolve();
    }

    if (module.isLoading) {
      return module.isReady();
    }

    module.preload();
    module.enable();
    return Promise.all(
      mapWindows(module.loadWindow.bind(module))
    ).then(() => {
      prefs.set(`modules.${moduleName}.enabled`, true);
    });
  }

  // use in runtime not startup
  // TODO: check this is working fine with new module loading
  disableModule(moduleName) {
    const module = this.availableModules[moduleName];

    if (!module.isEnabled) {
      return Promise.resolve();
    }

    // TODO: what if it was loading? Can we stop it?

    forEachWindow(module.unloadWindow.bind(module));
    module.disable();
    prefs.set(`modules.${moduleName}.enabled`, false);
    return Promise.resolve();
  }
}
