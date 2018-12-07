const moment = require('moment');

const DAY_MS = 1000 * 60 * 60 * 24;

const getDaysFromTimeRange = (startIn, end) => {
  let start = startIn;
  const result = [];
  while (start <= end) {
    result.push(`${Math.floor(start / DAY_MS)}`);
    start += DAY_MS;
  }
  return result;
};

const getTodayDayKey = timeMs => `${Math.floor((timeMs / DAY_MS))}`;

let mockedTS = Date.now();

module.exports = {
  'core/time': {
    getDaysFromTimeRange: function (startTS, endTS) {
      return getDaysFromTimeRange(startTS, endTS);
    },
    getDateFromDateKey: function (dateKey, hours = 0, min = 0) {
      return `${(Number(dateKey) * DAY_MS) + (hours * 60 * 60 * 1000) + (min * 60 * 1000)}`;
    },
    timestamp: function () {
      return mockedTS;
    },
    getTodayDayKey: function () {
      return getTodayDayKey(mockedTS);
    },
    getMockedTS: function () {
      return mockedTS;
    },
    setMockedTS: function (ts) {
      mockedTS = ts;
    },
    DAY_MS: DAY_MS,
  },
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
