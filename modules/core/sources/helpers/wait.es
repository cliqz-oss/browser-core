/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { setTimeoutIntervalInstant } from './timeout';
import * as timers from '../timers';


function waitForImpl(fn, timeout) {
  let error;
  let resolve;
  let reject;

  let timeoutId;
  let interval;

  // Clean-up resources
  const stop = () => {
    timers.clearTimeout(timeoutId);
    interval.stop();
  };

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const check = async () => {
    try {
      const result = await fn();
      // In case of truthy result, we stop
      if (result) {
        stop();
        resolve(result);
        return;
      }
    } catch (ex) {
      error = ex;
    }
  };

  // Start check at regular interval until one of the following conditions is met:
  // * `timeout` ms elapsed
  // * `fn` eventually results into a truthy values
  interval = setTimeoutIntervalInstant(check, 10);

  // Reject after `timeout` ms
  timeoutId = timers.setTimeout(() => {
    stop();
    reject(error || new Error('waitFor timeout'));
  }, timeout);

  return promise;
}

export function waitFor(fn, timeout = 15000) {
  return waitForImpl(fn, timeout);
}

export function wait(time) {
  return new Promise(resolve => timers.setTimeout(resolve, time));
}
