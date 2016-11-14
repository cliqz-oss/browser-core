import console from "platform/console";
import prefs from "core/prefs";

const isLoggingEnabled = prefs.get('showConsoleLogs', false);

let log;
let error;

if (isLoggingEnabled) {
  log = console.log.bind(console, 'CLIQZ');
  error = console.error.bind(console, 'CLIQZ error');
} else {
  log = () => {};
  error = () => {};
}

export default {
  log,
  error,
};
