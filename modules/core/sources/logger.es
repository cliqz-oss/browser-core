import console from '../platform/console';
import prefs from './prefs';
import { subscribe } from './events';
import DefaultMap from './helpers/default-map';


function noop() {}


/**
 * Provide a similar behavior as `console`, but based on `dump`.
 */
function multiArgsDump(...args) {
  if (args.length > 0) {
    dump(args[0]);

    for (let i = 1; i < args.length; i += 1) {
      dump(' ');
      dump(args[i]);
    }

    dump('\n');
  }
}


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

function isLoggingEnabled() {
  // detect dev flag on react-native
  const devMode = typeof global !== 'undefined' && global.__DEV__ === true;
  // either take flag from prefs, or global dev mode flag We need to put a try,
  // catch, to avoid content-scripts throwing error, while trying to get the
  // prefs. Should look for a cleaner solutions at some point.
  try {
    return prefs.get(LOG_PREF, devMode || false);
  } catch (ee) {
    return false;
  }
}

function getModuleLogLevelPref(module) {
  return `${LOG_LEVEL_PREF_PREFIX}${module}.level`;
}


class Logger {
  constructor({ getLevel, setLevel, prefix, useDump }) {
    this.getLevel = getLevel;
    this.setLevel = setLevel;

    // Define loggers
    this._debug = console.debug || noop;
    this._log = console.log || noop;
    this._warning = console.warn || noop;
    this._error = console.error || noop;

    if (useDump) {
      this._debug = multiArgsDump.bind(null, '[debug]');
      this._log = multiArgsDump.bind(null, '[log]');
      this._warning = multiArgsDump.bind(null, '[warning]');
      this._error = multiArgsDump.bind(null, '[error]');
    }

    if (prefix) {
      this._debug = this._debug.bind(null, prefix);
      this._log = this._log.bind(null, prefix);
      this._warning = this._warning.bind(null, prefix);
      this._error = this._error.bind(null, prefix);
    }
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
      return this._debug;
    }
    return noop;
  }

  get info() { return this.log; }

  get log() {
    if (this.isEnabledFor('log')) {
      return this._log;
    }
    return noop;
  }

  get warn() { return this.warning; }

  get warning() {
    if (this.isEnabledFor('warn')) {
      return this._warning;
    }
    return noop;
  }

  get error() {
    if (this.isEnabledFor('error')) {
      return this._error;
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
