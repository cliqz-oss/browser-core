import console from '../../core/console';
import OffersConfigs from '../offers_configs';

const LOG_PREFIX = '[offers-v2]';

/**
 * No-op function.
 */
function noop() {}

function timestampStr() {
  return `[${Date.now()}]`;
}

class OfferV2Logger {
  constructor() {
    this.init();
  }

  init() {
    this.LOG_LEVEL = OffersConfigs.LOG_LEVEL;
    const debugConsole = console.debug;
    const errorConsole = console.error;
    const infoConsole = console.log;
    const warnConsole = console.log;

    Object.defineProperty(this, 'debug', {
      get: () => Function.prototype.bind.call(debugConsole, console, LOG_PREFIX, '[debug]', timestampStr()),
      configurable: true,
    });
    Object.defineProperty(this, 'info', {
      get: () => Function.prototype.bind.call(infoConsole, console, LOG_PREFIX, '[info]', timestampStr()),
      configurable: true,
    });
    Object.defineProperty(this, 'log', {
      get: () => Function.prototype.bind.call(infoConsole, console, LOG_PREFIX, '[log]', timestampStr()),
      configurable: true,
    });
    Object.defineProperty(this, 'warn', {
      get: () => Function.prototype.bind.call(warnConsole, console, LOG_PREFIX, '[warn]', timestampStr()),
      configurable: true,
    });
    Object.defineProperty(this, 'error', {
      get: () => Function.prototype.bind.call(errorConsole, console, LOG_PREFIX, '[error]', timestampStr()),
      configurable: true,
    });

    this.logObject = (obj) => {
      // log object while keeping its state
      // since this is an expensive operation, we do it only if LOG_LEVEL == 'debug'
      if (this.LOG_LEVEL === 'debug') {
        this.debug(JSON.parse(JSON.stringify(obj)));
      }
    };

    if (this.LOG_LEVEL === 'off') {
      this._disableConsoles(['debug', 'info', 'log', 'warn', 'error']);
    } else if (this.LOG_LEVEL === 'error') {
      this._disableConsoles(['debug', 'info', 'log', 'warn']);
    } else if (this.LOG_LEVEL === 'warn' || this.LOG_LEVEL === 'info' || this.LOG_LEVEL === 'log') {
      this._disableConsoles(['debug']);
    }
  }

  _disableConsoles(consolesStr) {
    consolesStr.forEach((consoleStr) => {
      Object.defineProperty(this, consoleStr, {
        get: () => noop,
        configurable: true,
      });
    });
  }
}

/**
 * A customized logger object
 * Sample: Cliqz [offers-v2] [INFO] [1500559534046] log message   caller_source_file.js:line_number
 * Format: <Cliqz> <module_name> <log_level> <timestamp> <log message>    <caller:line_number>
 * support the log levels: debug < info (log) < warn < error < off
 * support the following functions:
 * - logger.debug(msg)
 * - logger.logObject(obj)
 * - logger.info(msg)
 * - logger.log(msg)
 * - logger.warn(msg)
 * - logger.error(msg)
 */
export default new OfferV2Logger();
