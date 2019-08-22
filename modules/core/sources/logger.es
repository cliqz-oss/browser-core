/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import console from '../platform/console';
import { isLoggingEnabled } from './console';
import prefs from './prefs';
import { subscribe } from './events';
import DefaultMap from './helpers/default-map';


function noop() {}

const LOG_LEVEL_PREF_PREFIX = 'logger.';
const DEFAULT_LOG_LEVEL = 'log';
const SUPPORTED_LOG_LEVELS = new Map([
  ['debug', 1],
  ['info', 2], // alias for 'log'
  ['log', 2],
  ['warn', 3], // alias for 'warning'
  ['warning', 3],
  ['error', 4],
  ['off', 5], // disable all logging
]);
const LOG_PREF = 'showConsoleLogs';

function getModuleLogLevelPref(module) {
  return `${LOG_LEVEL_PREF_PREFIX}${module}.level`;
}

let observerFunc;

class Logger {
  constructor({ getLevel, setLevel, prefix }) {
    this.getLevel = getLevel;
    this.setLevel = setLevel;

    // Define loggers
    this._debug = console.debug || noop;
    this._log = console.log || noop;
    this._warning = console.warn || noop;
    this._error = console.error || noop;

    if (prefix) {
      this._debug = this._debug.bind(null, prefix);
      this._log = this._log.bind(null, prefix);
      this._warning = this._warning.bind(null, prefix);
      this._error = this._error.bind(null, prefix);
    }
  }

  //
  // We want to use the console.<funcName> directly because it preserves
  // the line and file they were invoked from. If it is wrapped, then
  // the logs in the browser console will have `logger.es` as an origin.
  // There is no way to wrap a console function and retain the origin.
  //
  // In a normal extension run, we return the native console functions.
  // In case of integration tests and streaming of logger messages,
  // we have to use a wrapper, and then the wrapper augments messages
  // with the caller origin.
  //
  withObserverFunc(consoleFunc, level) {
    if (!observerFunc) {
      return consoleFunc;
    }
    return (...args) => {
      let callerLoc = (new Error()).stack.split('\n')[1];
      const i = callerLoc.lastIndexOf('/');
      if (i >= 0) {
        callerLoc = callerLoc.substring(i + 1, callerLoc.length - 1);
      }
      const augmentedArgs = [level, ...args, callerLoc];
      consoleFunc(...augmentedArgs);
      observerFunc(...augmentedArgs);
    };
  }

  setLevel(level) {
    return this.setLevel(level);
  }

  isEnabledFor(level) {
    const intLevel = SUPPORTED_LOG_LEVELS.get(level) || -1;
    return intLevel >= SUPPORTED_LOG_LEVELS.get(this.getLevel());
  }

  logObject(obj) {
    if (this.isEnabledFor('debug')) {
      this.debug(JSON.parse(JSON.stringify(obj)));
    }
  }

  exception(...args) {
    if (this.isEnabledFor('error')) {
      // Append a stack-track after the log messages.
      this._error(...args, (new Error()).stack);
    }
  }

  get debug() {
    if (this.isEnabledFor('debug')) {
      return this.withObserverFunc(this._debug, 'debug');
    }
    return noop;
  }

  get info() { return this.log; }

  get log() {
    if (this.isEnabledFor('log')) {
      return this.withObserverFunc(this._log, 'log');
    }
    return noop;
  }

  get warn() { return this.warning; }

  get warning() {
    if (this.isEnabledFor('warn')) {
      return this.withObserverFunc(this._warning, 'warning');
    }
    return noop;
  }

  get error() {
    if (this.isEnabledFor('error')) {
      return this.withObserverFunc(this._error, 'error');
    }
    return noop;
  }
}


class LoggerManager {
  constructor() {
    // This map stores the log-level of each module. It defaults to `log`,
    this.logLevels = new DefaultMap(() => DEFAULT_LOG_LEVEL);
    this.prefListener = null;
    this.loggingEnabled = isLoggingEnabled();
  }

  init() {
    this.prefListener = subscribe('prefchange', (pref) => {
      // Update log-level for specified module.
      if (pref.startsWith(LOG_LEVEL_PREF_PREFIX)) {
        const newValue = prefs.get(pref);
        if (!SUPPORTED_LOG_LEVELS.has(newValue)) {
          console.log(`Got invalid log level ${newValue} for ${pref}`);
        } else {
          this.logLevels.set(pref, newValue);
        }
      }
      if (pref === LOG_PREF) {
        this.loggingEnabled = prefs.get(pref);
      }
    });
  }

  // Logging is observed only from integration tests module. No need to
  // implement the complete generic subscribe/unsubscribe functionality.
  addObserver(cb) {
    observerFunc = cb;
  }

  enable() {
    this.loggingEnabled = true;
  }

  disable() {
    this.loggingEnabled = false;
  }

  unload() {
    if (this.prefListener !== null) {
      this.prefListener.unsubscribe();
      this.prefListener = null;
    }
  }

  get(module, options = {}) {
    const logLevelPref = getModuleLogLevelPref(module);
    const setLevel = (level) => {
      if (!SUPPORTED_LOG_LEVELS.has(level)) {
        return false;
      }

      // Cache this log level in memory.
      this.logLevels.set(logLevelPref, level);
      prefs.set(logLevelPref, options.level);
      return true;
    };

    // Initialize `level` for this module with the one in `options`.
    // Note that this will override any potential value set manually in the
    // pref.
    setLevel(options.level);

    return new Logger({
      getLevel: () => (this.loggingEnabled ? this.logLevels.get(logLevelPref) : 'off'),
      setLevel,

      prefix: `Cliqz [${module}]`,
      ...options,
    });
  }
}


// The life-cycle of this manager is similar to the one of core/resource-manager,
// We could implement this as a service. It will be initialized and unloaded by
// core/background, but it should probably be managed by the App itself.
const loggerManager = new LoggerManager();
export default loggerManager;
