/* global chai */
/* global sinon */
/* global describeModule */

const ajv = require('ajv');
const moment = require('moment');
const mockDexie = require('../../../core/unit/utils/dexie');

const CURRENT_DATE = '2017-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';

const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';

function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}

export default describeModule('anolysis/internals/anolysis',
  () => ({
    ...mockDexie,
    'platform/lib/moment': {
      default: moment,
    },
    'platform/lib/ajv': {
      default: ajv,
    },
    'core/services/pacemaker': {
      default: {
        setTimeout(cb) { cb(); },
        clearTimeout() {},
      }
    },
    'core/crypto/random': {
      randomInt() { return 0; },
    },
    'core/events': {
      default: {
        subscribe() {
          return {
            unsubscribe() {},
          };
        },
      },
    },
    'core/prefs': {
      default: {
        get(k, d) { return d; },
        set() {},
      }
    },
    'anolysis/internals/synchronized-date': {
      DATE_FORMAT,
      DAY_FORMAT,
      WEEK_FORMAT,
      MONTH_FORMAT,
      default() {
        return getCurrentDate();
      },
    },
    'anolysis/internals/gid-manager': {
      default: class GIDManager {
        init() { return Promise.resolve(); }

        getNewInstallDate() { return '2000-01-01'; }

        getGID() { return Promise.resolve(''); }
      },
    },
    'anolysis/internals/preprocessor': {
      default: class Preprocessor {},
    },
    'anolysis/internals/signals-queue': {
      default: class SignalQueue {
        init() { return Promise.resolve(); }

        flush() { return Promise.resolve(); }
      },
    },
    'anolysis/internals/analyses': {
      default: [
        { name: 'fake', generateSignals() { return [{}]; } },
      ],
    },
    'anolysis/internals/logger': {
      default: {
        // debug(...args) { console.log('DEBUG', ...args); },
        // log(...args) { console.log('LOG', ...args); },
        // error(...args) { console.log('ERROR', ...args); },
        debug() { },
        log() { },
        error() { },
      },
    },
  }),
  () => {
    let anolysis;

    beforeEach(async function () {
      const Storage = (await this.system.import('anolysis/internals/storage/dexie')).default;
      const Anolysis = this.module().default;
      const config = new Map();
      config.set('Storage', Storage);
      anolysis = new Anolysis(config);
      await anolysis.init();
    });

    afterEach(() => anolysis.storage.destroy());

    describe('#runDailyTasks', () => {
      let DefaultMap;

      beforeEach(async function () {
        DefaultMap = (await this.system.import('core/helpers/default-map')).default;

        // Register tasks
        await anolysis.updateRetentionState();
      });

      it('generates no signals if no metrics', async () => {
        anolysis.handleTelemetrySignal = sinon.spy(() => Promise.resolve());
        await anolysis.runDailyTasks();
        const dates = await anolysis.storage.aggregated.getAggregatedDates();
        chai.expect(dates.sort()).to.be.eql([CURRENT_DATE]);
      });

      it('generates signals from empty state', async () => {
        anolysis.handleTelemetrySignal = sinon.spy(() => Promise.resolve());

        const typesForDate = new DefaultMap(() => []);
        typesForDate.update('freshtab.home.click.news_pagination', (v) => { v.push({ index: 0 }); });
        anolysis.storage.behavior.getTypesForDate = sinon.spy(
          () => Promise.resolve(typesForDate)
        );

        await anolysis.runDailyTasks();
        const dates = await anolysis.storage.aggregated.getAggregatedDates();
        chai.expect(dates.sort()).to.be.eql([
          '2016-12-02',
          '2016-12-03',
          '2016-12-04',
          '2016-12-05',
          '2016-12-06',
          '2016-12-07',
          '2016-12-08',
          '2016-12-09',
          '2016-12-10',
          '2016-12-11',
          '2016-12-12',
          '2016-12-13',
          '2016-12-14',
          '2016-12-15',
          '2016-12-16',
          '2016-12-17',
          '2016-12-18',
          '2016-12-19',
          '2016-12-20',
          '2016-12-21',
          '2016-12-22',
          '2016-12-23',
          '2016-12-24',
          '2016-12-25',
          '2016-12-26',
          '2016-12-27',
          '2016-12-28',
          '2016-12-29',
          '2016-12-30',
          '2016-12-31',
          '2017-01-01',
        ]);
      });
    });

    describe('#runTasksForDay', () => {
      let DefaultMap;
      beforeEach(function () {
        return this.system.import('core/helpers/default-map')
          .then((module) => { DefaultMap = module.default; });
      });

      it('generates no signals if there is nothing to aggregate', () => {
        anolysis.storage.behavior.getTypesForDate = sinon.spy(() => Promise.resolve({
          get() { return []; },
          size: 0,
        }));
        anolysis.handleTelemetrySignal = sinon.spy(() => Promise.resolve());

        return anolysis.runTasksForDay(CURRENT_DATE, 1 /* offset */)
          .then(() => chai.expect(anolysis.storage.behavior.getTypesForDate)
            .to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called);
      });

      it('generates signals if there are signals for a day', () => {
        const typesForDate = new DefaultMap(() => []);
        typesForDate.update('freshtab.home.click.news_pagination', (v) => { v.push({ index: 0 }); });
        anolysis.storage.behavior.getTypesForDate = sinon.spy(
          () => Promise.resolve(typesForDate)
        );
        anolysis.handleTelemetrySignal = sinon.spy(() => Promise.resolve());

        return anolysis.runTasksForDay(CURRENT_DATE, 1 /* offset */)
          .then(() => chai.expect(anolysis.storage.behavior.getTypesForDate)
            .to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.have.been.called);
      });
    });

    describe('#handleTelemetrySignal', () => {
    });
  });
