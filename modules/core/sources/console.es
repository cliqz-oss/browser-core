import console from '../platform/console';
import prefs from './prefs';

// detect dev flag on react-native
const devMode = typeof global !== 'undefined' && global.__DEV__ === true;
// either take flag from prefs, or global dev mode flag
// We need to put a try, catch, to avoid content-scripts throwing error,
// while trying to get the prefs.
// Should look for a cleaner solutions at some point. for isLoggingEnabled, isDeveloper.

function isLoggingEnabled() {
  try {
    return prefs.get('showConsoleLogs', devMode || false);
  } catch (ee) {
    return false;
  }
}

function isDeveloper() {
  try {
    return prefs.get('developer', devMode || false);
  } catch (ee) {
    return false;
  }
}

let log;
let error;
let debug;
let warn;

if (isLoggingEnabled()) {
  log = console.log.bind(console, 'Cliqz');
  error = console.error.bind(console, 'Cliqz error');
  warn = console.warn.bind(console, 'Cliqz warning');
  if (isDeveloper()) {
    debug = log;
  } else {
    debug = () => {};
  }
} else {
  log = () => {};
  error = () => {};
  debug = () => {};
  warn = () => {};
}

export default {
  log,
  error,
  debug,
  warn,
};
