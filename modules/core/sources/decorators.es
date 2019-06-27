import sleep from './helpers/sleep';

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
