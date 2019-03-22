const moment = require('moment');

function isInRecursion() {
  const a = new Error().stack
    .split('\n')
    .filter(s => s.includes('unit/utils/time.js'));
  return (new Set(a)).size !== a.length;
}

module.exports = {
  'core/helpers/timeout': {
    default: function (f, _, ...args) { // setTimeoutInterval
      f(...args);
    },
  },
  'core/timers': {
    setTimeout: function (f, _, ...args) {
      if (!isInRecursion()) {
        f(...args);
      }
    },
    setInterval: function (f, _, ...args) {
      f(...args);
    },
  },
  'platform/lib/moment': {
    default: moment,
  },
};
