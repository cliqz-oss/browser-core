import console from "../platform/console";
import prefs from "./prefs";

const isLoggingEnabled = prefs.get('showConsoleLogs', false);

let log;
let error;
let debug;

if (isLoggingEnabled) {
  log = console.log.bind(console, 'Cliqz');
  error = console.error.bind(console, 'Cliqz error');
  if (prefs.get('developer')) {
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
