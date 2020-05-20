const moment = require('moment');

function isInRecursion() {
  const a = new Error().stack
    .split('\n')
    .filter(s => s.includes('unit/utils/time.js'));
  return (new Set(a)).size !== a.length;
}

function instantRunTimeout(fn, _, ...args) {
  if (!isInRecursion()) {
    fn(...args);
  }
}

module.exports = {
  'core/decorators': {
    nextTick(fn) {
      return Promise.resolve(fn());
    },
    deadline(p) { return p; },
    throttle: (_w, fn) => fn,
    debounce: fn => fn,
  },
  'core/services/pacemaker': {
    default: {
      setTimeout: instantRunTimeout,
      register: instantRunTimeout,
      everyHour() {},
      everyFewMinutes: instantRunTimeout,
      clearTimeout() {},
    },
  },
  'core/helpers/timeout': {
    default: instantRunTimeout,
  },
  'core/timers': {
    clearTimeout() {},
    setTimeout: instantRunTimeout,
    clearInterval() {},
    setInterval: instantRunTimeout,
  },
  'platform/lib/moment': {
    default: moment,
  },
};
