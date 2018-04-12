import utils from '../utils';

/**
 * setInterval implementation using setTimeout as base method. This helper was
 * created with the intention of solving the multiple calls that can happen using
 * the setInterval function (if computer goes to sleep for example).
 *
 * To create an interval:
 * const timer = setTimeoutInterval(() => console.log('x'), 1000);
 *
 * To stop it:
 * timer.stop();
 *
 */
export default function setTimeoutInterval(f, timeoutMS) {
  let enabled = true;
  let timeout = null;

  const runTimeout = () => {
    if (enabled) {
      try { f(); } catch (ex) { /* Ignore exception */ }
      timeout = utils.setTimeout(runTimeout, timeoutMS);
    }
  };

  const stop = () => {
    enabled = false;
    utils.clearTimeout(timeout);
  };

  // Start running
  timeout = utils.setTimeout(runTimeout, timeoutMS);

  return {
    stop,
  };
}
