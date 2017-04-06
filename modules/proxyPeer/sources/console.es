import console from '../core/console';


const DEBUG = false;

let debug = () => {};
if (DEBUG) {
  debug = console.debug;
}


export default {
  log: console.log,
  error: console.error,
  debug,
};
