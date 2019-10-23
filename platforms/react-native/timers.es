/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  InteractionManager,
  DeviceEventEmitter,
  AppState,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';

const LONG_TIMER_THRESHOLD = 30000;
let longTimers = [];
let nextTask = Number.MAX_SAFE_INTEGER;
let taskScheduled = false;

function _setTimeout(fn, timeout, ...args) {
  if (timeout < LONG_TIMER_THRESHOLD) {
    return setTimeout(fn, timeout, ...args);
  }
  const runAt = Date.now() + timeout;
  longTimers.push({
    runAt,
    fn,
    args,
  });
  nextTask = Math.min(nextTask, runAt);
  return null;
}

/**
 * Triggered on user-interaction with the app (via search inputs).
 * If there is an interaction, we check if we are already running scheduling, or if there is a task
 * that should be run in the next 30s (which would usually generate a warning in react-native).
 * If there is a task due, we wait for a good time to run (i.e. after interfactions), then run
 * schedule all timers that are due in the next 30s. We then reset the next run time to the most
 * recent of the remaining tasks.
 */
function timerScheduler() {
  if (!taskScheduled && nextTask - Date.now() < LONG_TIMER_THRESHOLD) {
    taskScheduled = true;
    InteractionManager.runAfterInteractions(() => {
      try {
        const tNext = nextTask - Date.now();
        if (tNext < LONG_TIMER_THRESHOLD) {
          // reset nextTask
          nextTask = Number.MAX_SAFE_INTEGER;
          const taskWasRun = longTimers.map(({ runAt, fn, args }) => {
            // calculate when this task should be run
            const runIn = Math.max(runAt - Date.now(), 1);
            if (runIn > LONG_TIMER_THRESHOLD) {
              // don't run, and set nextTask run time
              nextTask = Math.min(nextTask, runAt);
              return false;
            }
            // schedule task
            setTimeout(fn, runIn, ...args);
            return true;
          });
          // keep tasks which weren't run yet
          longTimers = longTimers.filter((_, i) => !taskWasRun[i]);
        }
      } finally {
        taskScheduled = false;
      }
    });
  }
}

// Triggers for timer wake.

// Legacy native bridge events
if (NativeModules.JSBridge) {
  const bridgeEvents = new NativeEventEmitter(NativeModules.JSBridge);
  bridgeEvents.addListener('callAction', timerScheduler);
  bridgeEvents.addListener('publishEvent', timerScheduler);
}
// Newer apps emit search events via DeviceEventEmitter directly
DeviceEventEmitter.addListener('action', timerScheduler);
// When app moves to active or background state
AppState.addEventListener('change', (state) => {
  if (state !== 'inactive') {
    timerScheduler();
  }
});

const _setInterval = setInterval;
const _clearTimeout = clearTimeout;
const _clearInterval = clearInterval;

export {
  _setTimeout as setTimeout,
  _setInterval as setInterval,
  _clearTimeout as clearTimeout,
  _clearInterval as clearInterval
};
