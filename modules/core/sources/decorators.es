/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import sleep from './helpers/sleep';
import { clearTimeout, setTimeout } from '../core/timers';

export function throttle(window, fn, threshhold) {
  let last;
  let timer;
  return (...args) => {
    const now = Date.now();
    if (last && now < last + threshhold) {
      // reset timeout
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        last = now;
        fn(...args);
      }, threshhold);
    } else {
      last = now;
      fn(...args);
    }
  };
}

/**
 * simple version of https://davidwalsh.name/javascript-debounce-function,
 * without options to cancel or execute immediately.
 *
 * @param {Function} fn
 * @param {number} [delay] in ms
 * @returns {Function} the debounced function,
 * or the given function when delay is falsy.
 */
export function debounce(fn, delay) {
  let timeout = null;
  return !delay ? fn : function debounced(...args) {
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/clearTimeout
    // Passing an invalid ID to clearTimeout() silently does nothing; no exception is thrown.
    clearTimeout(timeout);

    const delayed = () => {
      timeout = null;
      fn(...args);
    };
    timeout = setTimeout(delayed, delay);
  };
}

export function deadline(promise, timeout) {
  return Promise.race([
    sleep(timeout),
    promise,
  ]);
}

export function nextTick(fn, ...args) {
  return Promise.resolve().then(() => fn(...args));
}

export function nextIdle() {
  if ((typeof window === 'undefined') || !window.requestIdleCallback) {
    return nextTick(() => {});
  }

  return new Promise((resolve) => {
    window.requestIdleCallback(resolve);
  });
}

export async function withTimeout(promise, timeoutInMs) {
  let timer;
  try {
    timer = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutInMs / 1000} seconds`)), timeoutInMs);
    });
    return await Promise.race([promise, timer]);
  } finally {
    clearTimeout(timer);
  }
}

// Helper if you only want to print the result of a promise.
export async function tryPromise(promise, timeoutInMs = 1000) {
  try {
    return await withTimeout(promise, timeoutInMs);
  } catch (e) {
    return `Failed: ${e}`;
  }
}
