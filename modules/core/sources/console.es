/* globals __DEV__ */
import console from "../platform/console";
import prefs from "./prefs";

// detect dev flag on react-native
const devMode = typeof global !== 'undefined' && global.__DEV__ === true;
// either take flag from prefs, or global dev mode flag
const isLoggingEnabled = prefs.get('showConsoleLogs', devMode || false);

let log;
let error;
let debug;

if (isLoggingEnabled) {
  log = console.log.bind(console, 'Cliqz');
  error = console.error.bind(console, 'Cliqz error');
  if (prefs.get('developer', devMode || false)) {
    debug = log;
  } else {
    debug = () => {};
  }
} else {
  log = () => {};
  error = () => {};
  debug = () => {};
}

export default {
  log,
  error,
  debug,
};
