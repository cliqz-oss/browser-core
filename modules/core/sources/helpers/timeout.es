/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as timers from '../timers';

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
function setTimeoutIntervalImpl(f, timeoutMS, args, instantStart) {
  let enabled = true;
  let timeout = null;

  const runTimeout = async () => {
    if (enabled) {
      // Call `f` and make sure we wait for it to terminate before we trigger
      // the next timeout (even if the function is async).
      try { await f(...args); } catch (ex) { /* Ignore */ }
    }

    if (enabled) {
      timeout = timers.setTimeout(runTimeout, timeoutMS);
    }
  };

  const stop = () => {
    enabled = false;
    timers.clearTimeout(timeout);
  };

  // Start running
  timeout = timers.setTimeout(runTimeout, instantStart ? 0 : timeoutMS);

  return {
    stop,
  };
}


export default function setTimeoutInterval(f, timeoutMS, ...args) {
  return setTimeoutIntervalImpl(f, timeoutMS, args, false);
}

export function setTimeoutIntervalInstant(f, timeoutMS, ...args) {
  return setTimeoutIntervalImpl(f, timeoutMS, args, true);
}
