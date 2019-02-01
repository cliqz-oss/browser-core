import console from '../platform/console';
import prefs from './prefs';
import { isBetaVersion } from '../platform/platform';

function noop() {}

function isLoggingEnabled() {
  // detect dev flag on react-native
  const devMode = (typeof global !== 'undefined' && global.__DEV__ === true) || isBetaVersion();
  // either take flag from prefs, or global dev mode flag We need to put a try,
  // catch, to avoid content-scripts throwing error, while trying to get the
  // prefs. Should look for a cleaner solutions at some point.
  try {
    return prefs.get('showConsoleLogs', devMode || false);
  } catch (ee) {
    return false;
  }
}

const _console = {};

export function enable() {
  _console.debug = console.log.bind(console, 'Cliqz [debug]');
  _console.log = console.log.bind(console, 'Cliqz');
  _console.error = console.error.bind(console, 'Cliqz [error]');
  _console.warn = console.warn.bind(console, 'Cliqz [warning]');
  _console.warning = _console.warn;
}

export function disable() {
  _console.debug = noop;
  _console.log = noop;
  _console.warn = noop;
  _console.warning = noop;
  _console.error = noop;
}

if (isLoggingEnabled()) {
  enable();
} else {
  disable();
}

export default _console;
