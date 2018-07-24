/* global chai */

const moment = require('moment');

const CURRENT_DATE = '2018-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';
const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';


function compareSignal(signals, expected, initialOffset) {
  chai.expect(signals).to.have.length(expected.length);

  for (let i = 0; i < signals.length; i += 1) {
    chai.expect(signals[i].units_active).to.equal(expected[i]);
    chai.expect(signals[i].offset).to.equal(i + initialOffset);
  }
}

function dailyRetentionState(daysActive = []) {
  if (daysActive.indexOf(CURRENT_DATE) === -1) {
    daysActive.push(CURRENT_DATE);
  }

  const daily = {};
  daysActive.forEach((date) => {
    const d = moment(date, DATE_FORMAT);
    daily[d.format(DAY_FORMAT)] = [date];
  });

  return { daily };
}

function weeklyRetentionState(daysActive = []) {
  if (daysActive.indexOf(CURRENT_DATE) === -1) {
    daysActive.push(CURRENT_DATE);
  }

  const weekly = {};
  daysActive.forEach((date) => {
    const week = moment(date, DATE_FORMAT).format(WEEK_FORMAT);
    if (weekly[week] === undefined) {
      weekly[week] = [];
    }

    if (weekly[week].indexOf(date) === -1) {
      weekly[week].push(date);
    }
  });

  return { weekly };
}

function monthlyRetentionState(daysActive = []) {
  if (daysActive.indexOf(CURRENT_DATE) === -1) {
    daysActive.push(CURRENT_DATE);
  }

  const monthly = {};
  daysActive.forEach((date) => {
    const month = moment(date, DATE_FORMAT).format(MONTH_FORMAT);
    const week = moment(date, DATE_FORMAT).format(WEEK_FORMAT);
    if (monthly[month] === undefined) {
      monthly[month] = [];
    }

    if (monthly[month].indexOf(week) === -1) {
      monthly[month].push(week);
    }
  });

  return { monthly };
}


let retentionStateMock = {};


function getRetentionState() {
  return JSON.parse(JSON.stringify({
    // Default
    ...dailyRetentionState([]),
    ...weeklyRetentionState([]),
    ...monthlyRetentionState([]),

    ...retentionStateMock,
  }));
}


function mockActivity(daysActive) {
  retentionStateMock = {
    ...dailyRetentionState(daysActive),
    ...weeklyRetentionState(daysActive),
    ...monthlyRetentionState(daysActive),
  };
}


module.exports = ({ name, tests }) => {
  beforeEach(() => {
    mockActivity();
  });

  // eslint-disable-next-line global-require
  require('../telemetry-schemas-test-helpers')({
    name,
    metrics: [],
    currentDate: CURRENT_DATE,
    retentionState: new Proxy({}, {
      get(_, prop) {
        return getRetentionState()[prop];
      },
    }),
    tests: generateAnalysisResults => tests({
      mockActivity,
      compareSignal,
      generateAnalysisResults,
      CURRENT_DATE,
    }),
  });
};
