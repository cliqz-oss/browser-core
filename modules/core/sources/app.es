/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */
import browserPolyfill from 'webextension-polyfill';

import config from './config';
import events, { subscribe } from './events';
import prefs from './prefs';
import Module from './app/module';
import { setApp } from './kord';
import console, { isLoggingEnabled, enable as enableConsole, disable as disableConsole } from './console';
import Logger from './logger';
import telemetry from './services/telemetry';
import { enableChangeEvents, disableChangeEvents } from '../platform/browser';
import Defer from './helpers/defer';
import { getChannel } from '../platform/demographics';
import createSettings from './settings';
import * as i18n from './i18n';
import migrate from './app/migrations';

export function shouldEnableModule(name) {
  const pref = `modules.${name}.enabled`;
  return prefs.get(pref) !== false;
}

function setupConsole() {
  if (isLoggingEnabled()) {
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
  // Cliqz products extract `version` from the manifest.
  // But if `App` is instantiated by a third-party that uses
  // `browser-core` as a library, then no `version` is given
  // and therefore `App` should find out the version self.
  constructor({ version = config.EXTENSION_VERSION, debug, browser = browserPolyfill } = {}) {
    this.settings = createSettings(config.settings, { version });
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

    this._startedDefer = new Defer();

    config.modules.forEach((moduleName) => {
      const module = new Module(moduleName, this.settings, browser);

      // special handling for core as it is not really a module and it manages app state
      if (moduleName === 'core' && module.backgroundModule) {
        module.backgroundModule.app = this;
      }

      this.modules[moduleName] = module;

      // Keep reference to all module services by their name
      // Currently last one wins
      Object.assign(this.services, module.providedServices);
    });

    setApp(this);
    this.isRunning = false;
  }

  injectHelpers() {
    this.events = events;
    this.prefs = prefs;
    this.i18n = i18n;
  }

  /**
   * should be used only for testing!
   *
   * @method extensionRestart
   * @param {function} changes - function called between stop and start
   */
  extensionRestart(changes) {
    // unload background
    this.unload();

    // apply changes
    if (changes) {
      changes();
    }

    // load background
    return this.load();
  }

  /**
   * Starts the Cliqz App.
   * Loads all required services and module backgrounds.
   *
   * Modules that are marked as disabled will not be loaded. To mark a module
   * as disabled set a preference `modules.<moduleName>.enabled` to `false`.
   *
   * @method start
   * @returns {Promise}
   */
  async start() {
    this.isRunning = true;

    if (!this.settings.channel) {
      this.settings.channel = await getChannel();
    }
    await this.setupPrefs();
    await this.load();
    enableChangeEvents();
    this.injectHelpers();
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
    // NOTE: Disable this warning locally since the solution is hacky anyway.
    /* eslint-disable no-param-reassign */

    telemetry.push({
      type: 'activity',
      action: telemetrySignal,
      lifecyle: 'stop'
    }, undefined, true /* force push */);

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

    if (disable && this.settings.channel === '40') {
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
      this.unload();
      return;
    }

    this.unload();

    disableChangeEvents();
  }

  get moduleList() {
    const modules = this.modules;
    return Object.keys(modules).map(moduleName => modules[moduleName]);
  }

  enabledModules() {
    return this.moduleList.filter(module => module.isEnabled);
  }

  async setupPrefs() {
    const initPrefs = prefs.init || Promise.resolve.bind(Promise);

    await initPrefs();

    if (config.environment === 'development' || this.debug) {
      prefs.set('developer', true);
    }

    setupConsole();

    await migrate();

    this.prefchangeEventListener = subscribe('prefchange', this.onPrefChange, this);
  }

  prepareServices(serviceNames) {
    return Promise.all(
      serviceNames.map(
        // service is initialized only once, so calling init multiple times is fine
        async (serviceName) => {
          try {
            await this.services[serviceName].init(this);
          } catch (e) {
            console.error('App', 'cannot load service', serviceName, e);
          }
        }
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
      () => module.enable()
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
    const disabledModules = allModules.filter(x => !shouldEnableModule(x.name));

    // all modules start in undefined state
    // they have to be marked as disabled so they wont accept kord actions
    disabledModules.forEach(m => m.markAsDisabled());

    // we load core first before any other module
    return this.loadModule(core)
      // loading of modules should be paralellized as much as possible
      .then(() => {
        // do not return - we trigger module loading and let window loading to
        // start as soon as possible
        // TODO: should we return now?
        Promise.all(modules.map(x => this.loadModule(x)))
          .then(() => {
            console.log('App', 'Loading modules -- all loaded');
            this.isFullyLoaded = true;
            this._startedDefer.resolve();
          })
          .catch((e) => {
            console.error('App', 'Loading modules failed', e);
            this._startedDefer.reject(e);
          });
      });
  }

  unload() {
    if (this.prefchangeEventListener) {
      this.prefchangeEventListener.unsubscribe();
    }

    console.log('App', 'unload background modules');
    this.enabledModules().reverse().forEach((module) => {
      try {
        console.log('App', 'unload background module: ', module.name);
        module.disable();
      } catch (e) {
        console.error(`Error unloading module: ${module.name}`, e);
      }
    });
    console.log('App', 'unload background modules finished');
    console.log('App', 'unload services');
    this.unloadServices();
    console.log('App', 'unload services finished');
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

    const moduleName = prefParts.pop();
    const shouldEnable = shouldEnableModule(moduleName);
    const shouldDisable = !shouldEnable;
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
   * Enabled module background. Returns early if module is already enabled.
   *
   * It sets the `modules.<moduleName>.enabled` pref to true.
   *
   * @method enableModule
   * @params {string} moduleName - name of the module
   * @returns {Promise}
   */
  enableModule(moduleName) {
    const module = this.modules[moduleName];
    const prefName = `modules.${moduleName}.enabled`;
    if (prefs.has(prefName) && prefs.get(prefName) !== true) {
      prefs.set(prefName, true);
    }

    if (module.isEnabled || !this.isRunning) {
      return Promise.resolve();
    }

    return module.isEnabling ? module.isReady() : this.loadModule(module);
  }

  /**
   * Disable module background. Does nothing if module is already disabled.
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
    const prefName = `modules.${moduleName}.enabled`;
    if (!prefs.has(prefName) || prefs.get(prefName) !== false) {
      prefs.set(prefName, false);
    }

    if (module.isNotInitialized || module.isDisabled || !this.isRunning) {
      return Promise.resolve();
    }

    if (module.isEnabling) {
      return module.isReady().then(() => module.disable());
    }

    module.disable();

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
