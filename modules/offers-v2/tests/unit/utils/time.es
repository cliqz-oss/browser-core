const moment = require('moment');

module.exports = {
  'core/helpers/timeout': {
    default: function () { // setTimeoutInterval
      console.warn('unmocked setTimeoutInterval is used');
      const stop = () => {}; return { stop };
    },
  },
  'core/timers': {
    setTimeout: function () {
      console.warn('unmocked setTimeout is used');
      cb => cb();
    },
    setInterval: function () {
      console.warn('unmocked setInterval is used');
      cb => cb();
    },
  },
  'platform/lib/moment': {
    default: moment,
  },
};
