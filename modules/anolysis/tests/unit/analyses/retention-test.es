/* global chai */
/* global describeModule */


const moment = System._nodeRequire('moment');

const DATE_FORMAT = 'YYYY-MM-DD';
const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';


function getCurrentDate() {
  return moment('2017-01-01', DATE_FORMAT);
}

function compareSignal(signals, expected, initialOffset = 0) {
  chai.expect(signals).to.have.length(expected.length);

  for (let i = 0; i < signals.length; i += 1) {
    chai.expect(signals[i][1].units_active).to.equal(expected[i]);
    chai.expect(signals[i][1].offset).to.equal(i + initialOffset);
  }
}


function testDaily(formattedDate, daysActive, result, generateDailyRetention) {
  // Create initial state
  const dayState = {};
  daysActive.forEach((date) => {
    const d = moment(date, DATE_FORMAT);
    dayState[d.format(DAY_FORMAT)] = [date];
  });

  // Generate signals and compare with expected result
  compareSignal(
    generateDailyRetention(dayState, formattedDate),
    result,
  );

  // Does not generate twice the same day:
  chai.expect(generateDailyRetention(dayState, formattedDate)).to.have.length(0);
}


function testWeekly(formattedDate, daysActive, result, generateWeeklyRetention) {
  // Create initial state
  const weekState = {};
  daysActive.forEach((date) => {
    const week = moment(date, DATE_FORMAT).format(WEEK_FORMAT);
    if (weekState[week] === undefined) {
      weekState[week] = [];
    }

    if (weekState[week].indexOf(date) === -1) {
      weekState[week].push(date);
    }
  });

  // Generate signals and compare with expected result
  compareSignal(
    generateWeeklyRetention(weekState, formattedDate),
    result,
    1,
  );

  // Does not generate twice the same day:
  chai.expect(generateWeeklyRetention(weekState, formattedDate)).to.have.length(0);
}


function testMonthly(formattedDate, daysActive, result, generateMonthlyRetention) {
  // Create initial state
  const monthState = {};
  daysActive.forEach((date) => {
    const month = moment(date, DATE_FORMAT).format(MONTH_FORMAT);
    const week = moment(date, DATE_FORMAT).format(WEEK_FORMAT);
    if (monthState[month] === undefined) {
      monthState[month] = [];
    }

    if (monthState[month].indexOf(week) === -1) {
      monthState[month].push(week);
    }
  });

  // Generate signals and compare with expected result
  compareSignal(
    generateMonthlyRetention(monthState, formattedDate),
    result,
    1,
  );

  // Does not generate twice the same day:
  chai.expect(generateMonthlyRetention(monthState, formattedDate)).to.have.length(0);
}


export default describeModule('anolysis/analyses/retention',
  () => ({
    'platform/moment': {
      default: moment,
    },
    'anolysis/synchronized-date': {
      DATE_FORMAT,
      DAY_FORMAT,
      WEEK_FORMAT,
      MONTH_FORMAT,
      default() {
        return getCurrentDate();
      },
    },
    'anolysis/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
  }),
  () => {
    describe('Generate full retention', () => {
      let generateRetentionSignals;

      beforeEach(function importSignalGenerator() {
        generateRetentionSignals = this.module().default;
      });

      it('generates 32 signals', () => {
        chai.expect(generateRetentionSignals({})).to.have.length(32);
      });

      it('does not generate twice in a day', () => {
        const date = getCurrentDate();
        const formattedDate = date.format(DATE_FORMAT);
        const currentDay = date.format(DAY_FORMAT);
        const currentWeek = date.format(WEEK_FORMAT);
        const currentMonth = date.format(MONTH_FORMAT);

        const state = {};
        const expected = {
          daily: {},
          weekly: {},
          monthly: {},
        };
        expected.daily[currentDay] = [formattedDate];
        expected.weekly[currentWeek] = [formattedDate];
        expected.monthly[currentMonth] = [currentWeek];

        chai.expect(generateRetentionSignals(state)).to.have.length(32);
        chai.expect(state).to.eql(expected);
        chai.expect(generateRetentionSignals(state)).to.have.length(0);
        chai.expect(state).to.eql(expected);
      });
    });

    describe('Daily retention', () => {
      let generateDailyRetention;

      beforeEach(function importSignalGenerator() {
        generateDailyRetention = this.module().generateDailyRetention;
      });

      it('generates inactive signals', () => {
        testDaily(
          '2017-12-12',
          [],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateDailyRetention);
      });

      it('generates 1 day activity', () => {
        testDaily(
          '2017-12-12',
          ['2017-12-12'],
          [], // Day is already present in the state
          generateDailyRetention);
      });

      it('generates 2 days activity', () => {
        testDaily(
          '2017-12-12',
          ['2017-12-11'],
          [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
          generateDailyRetention);
      });

      it('generates 10 days activity', () => {
        testDaily(
          '2017-12-12',
          [
            '2017-12-11', '2017-12-10', '2017-12-09', '2017-12-08',
            '2017-12-07', '2017-12-06', '2017-12-05', '2017-12-04',
            '2017-12-03',
          ],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          generateDailyRetention);
      });
    });

    describe('Weekly retention', () => {
      let generateWeeklyRetention;

      beforeEach(function importSignalGenerator() {
        generateWeeklyRetention = this.module().generateWeeklyRetention;
      });

      it('has 10 signals', () => {
        testWeekly(
          '2017-12-12',
          [],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateWeeklyRetention);
      });

      it('generates starting at first week of the year (1)', () => {
        testWeekly(
          '2018-01-01',
          ['2017-12-30'],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateWeeklyRetention);
      });

      it('generates starting at first week of the year (2)', () => {
        testWeekly(
          '2018-01-01',
          ['2017-12-30', '2017-12-29'],
          [2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateWeeklyRetention);
      });

      it('generates starting at first week of the year (7)', () => {
        testWeekly(
          '2018-01-01',
          ['2017-12-31', '2017-12-30', '2017-12-29', '2017-12-28', '2017-12-27', '2017-12-26', '2017-12-25'],
          [7, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateWeeklyRetention);
      });
    });

    describe('Monthly retention', () => {
      let generateMonthlyRetention;

      beforeEach(function importSignalGenerator() {
        generateMonthlyRetention = this.module().generateMonthlyRetention;
      });

      it('generates 12 signals', () => {
        testMonthly(
          '2017-12-12',
          [],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateMonthlyRetention);
      });

      it('generates starting first at month of the year (0)', () => {
        testMonthly(
          '2017-01-01',
          [],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateMonthlyRetention);
      });

      it('generates starting first at month of the year (1)', () => {
        testMonthly(
          '2018-01-01',
          ['2017-12-20'],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateMonthlyRetention);
      });

      it('generates starting first at month of the year (1)', () => {
        testMonthly(
          '2018-01-01',
          ['2017-12-31', '2017-12-30', '2017-12-29', '2017-12-28', '2017-12-27', '2017-12-26', '2017-12-25'],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          generateMonthlyRetention);
      });

      it('generates starting first at month of the year (2)', () => {
        testMonthly(
          '2018-01-01',
          ['2017-12-31', '2017-12-30', '2017-12-29', '2017-12-28', '2017-12-27', '2017-12-26', '2017-12-25', '2017-01-20'],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          generateMonthlyRetention);
      });
    });
  },
);
