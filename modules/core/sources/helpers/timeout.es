import console from '../console';

/**
 * setInterval implementation using setTimeout as base method. This helper was
 * created with the intention of solving the multiple calls that can happen
 * using the setInterval function (if computer goes to sleep for example).
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

  const runTimeout = async () => {
    if (enabled) {
      // Call `f` and make sure we wait for it to terminate before we trigger
      // the next timeout (even if the function is async).
      try { await f(); } catch (ex) { console.error(ex); }
    }

    if (enabled) {
      timeout = setTimeout(runTimeout, timeoutMS);
    }
  };

  const stop = () => {
    enabled = false;
    clearTimeout(timeout);
  };

  // Start running
  timeout = setTimeout(runTimeout, timeoutMS);

  return {
    stop,
  };
}
