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

export function nextTick(fn, ...args) {
  return Promise.resolve().then(() => fn(...args));
}
