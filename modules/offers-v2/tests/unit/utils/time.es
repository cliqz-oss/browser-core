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
    nextTick(fn) { fn(); },
    deadline(p) { return p; },
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
    setTimeout: instantRunTimeout,
    setInterval: instantRunTimeout,
  },
  'platform/lib/moment': {
    default: moment,
  },
};
