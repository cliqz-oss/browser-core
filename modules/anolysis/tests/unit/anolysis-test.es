/* global chai */
/* global sinon */
/* global describeModule */

const Dexie = require('dexie');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
const ajv = require('ajv');
const indexedDB = require('fake-indexeddb');
const moment = require('moment');

const CURRENT_DATE = '2017-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';

const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';

function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}

function handleTelemetrySignalMock() {
  return Promise.resolve();
}

function initDexie(name) {
  return new Dexie(name, {
    indexedDB,
    IDBKeyRange,
  });
}

export default describeModule('anolysis/anolysis',
  () => ({
    'platform/lib/moment': {
      default: moment,
    },
    'platform/lib/ajv': {
      default: ajv,
    },
    'platform/lib/dexie': {
      default: () => Promise.resolve(initDexie),
    },
    'core/crypto/random': {
      randomInt() { return 0; },
    },
    'core/database': {
      default: class Database { destroy() { return Promise.resolve(); } },
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
    'anolysis/synchronized-date': {
      DATE_FORMAT,
      DAY_FORMAT,
      WEEK_FORMAT,
      MONTH_FORMAT,
      default() {
        return getCurrentDate();
      },
    },
    'core/cliqz': {
      utils: {
        getPref() {},
        setPref() {},
        setTimeout(fun) { return fun(); },
        setInterval() { },
        clearTimeout() { },
      },
    },
    'core/prefs': {
      default: {
        get(k, d) { return d; },
      }
    },
    'anolysis/aggregator': {
      default: class BehaviorAggregator {},
    },
    'anolysis/gid-manager': {
      default: class GIDManager {
        init() { return Promise.resolve(); }
        getNewInstallDate() { return '2000-01-01'; }
        getGID() { return Promise.resolve(''); }
      },
    },
    'anolysis/preprocessor': {
      default: class Preprocessor {},
    },
    'anolysis/signals-queue': {
      default: class SignalQueue {
        init() { return Promise.resolve(); }
        flush() { return Promise.resolve(); }
      },
    },
    'anolysis/analyses': {
      default: [
        { name: 'fake', generateSignals() { return [{}]; } },
      ],
    },
    'anolysis/logger': {
      default: {
        debug() {},
        log() {},
        error(...args) { console.log('ERROR', ...args); },
      },
    },
  }),
  () => {
    let anolysis;

    beforeEach(function importAnolysis() {
      const Anolysis = this.module().default;
      anolysis = new Anolysis();
      return anolysis.init();
    });

    afterEach(() => anolysis.storage.destroy());

    describe('#registerSchemas', () => {
      it('correctly adds schemas', () => {
        chai.expect(anolysis.availableSchemas.size).to.equal(0);
        return Promise.resolve()
          .then(() => anolysis.registerSchemas({
            signal1: { schema: {} },
            signal2: { schema: {} },
          }))
          .then(() => chai.expect(anolysis.availableSchemas.size).to.equal(2))
          .then(() => {
            const schemas = [...anolysis.availableSchemas.keys()];
            chai.expect(schemas).to.eql(['signal1', 'signal2']);
          });
      });

      it('fails on duplicates', () =>
        chai.expect(
          Promise.resolve()
            .then(() => anolysis.registerSchemas({ signal1: {}, signal2: {} }))
            .then(() => anolysis.registerSchemas({ signal1: {} }))
        ).to.be.rejected
      );
    });

    describe('#sendRetentionSignals', () => {
      it('generates retention from empty state', () => {
        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);
        return anolysis.sendRetentionSignals()
          .then(() => chai.expect(anolysis.handleTelemetrySignal.callCount).to.equal(32))
          .then(() => anolysis.storage.retention.getState())
          .then(state => chai.expect(state).to.be.eql({
            daily: { '2017-1': [CURRENT_DATE] },
            weekly: { '2017-52': [CURRENT_DATE] },
            monthly: { '2017-1': ['2017-52'] }
          }));
      });

      it('does not generate retention signals two times', () => {
        const initialState = {
          daily: { '2017-1': [CURRENT_DATE] },
          weekly: { '2017-52': [CURRENT_DATE] },
          monthly: { '2017-1': ['2017-52'] }
        };
        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);
        return anolysis.storage.retention.setState(initialState)
          .then(() => anolysis.sendRetentionSignals())
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called)
          .then(() => anolysis.storage.retention.getState())
          .then(state => chai.expect(state).to.be.eql(initialState));
      });
    });

    describe('#generateAnalysesSignalsFromAggregation', () => {
      it('generates signals from empty state', () => {
        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);

        return anolysis.generateAnalysesSignalsFromAggregation()
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called)
          .then(() => anolysis.storage.aggregated.getAggregatedDates())
          .then(dates => chai.expect(dates.sort()).to.be.eql([
            '2016-12-01',
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
          ]));
      });

      it('does not generate signals when day is already present', () => {
        const existingState = { foo: 42 };

        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);
        return anolysis.storage.aggregated.storeAggregation(CURRENT_DATE, existingState)
          .then(() => anolysis.generateAnalysesSignalsFromAggregation())
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called)
          .then(() => anolysis.storage.aggregated.getAggregation(CURRENT_DATE))
          .then(state => chai.expect(state).to.be.eql(existingState));
      });
    });

    describe('#generateAndSendAnalysesSignalsForDay', () => {
      let schemas;
      beforeEach(function () {
        return this.system.import('anolysis/telemetry-schemas')
          .then((module) => {
            schemas = module.default;
            anolysis.registerSchemas(schemas);
          });
      });

      it('generates no signals if there is nothing to aggregate', () => {
        anolysis.storage.behavior.getTypesForDate = sinon.spy(() => Promise.resolve({}));
        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);

        // Get number of schemas which do not expect any aggregation as argument
        let count = 0;
        Object.keys(schemas).forEach((name) => {
          const schema = schemas[name];
          if (schema.generate !== undefined && schema.generate.length === 0) {
            count += 1;
          }
        });

        return anolysis.generateAndSendAnalysesSignalsForDay(CURRENT_DATE)
          .then(() => chai.expect(anolysis.storage.behavior.getTypesForDate).to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.have.callCount(count));
      });

      it('generates signals if there are signals for a day', () => {
        anolysis.storage.behavior.getTypesForDate = sinon.spy(
          () => Promise.resolve({ size: 1 })
        );
        anolysis.behaviorAggregator.aggregate = sinon.spy(() => ({
          types: {},
        }));
        anolysis.handleTelemetrySignal = sinon.spy(() => Promise.resolve());

        return anolysis.generateAndSendAnalysesSignalsForDay(CURRENT_DATE)
          .then(() => chai.expect(anolysis.storage.behavior.getTypesForDate).to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.behaviorAggregator.aggregate).to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.have.been.called);
      });
    });

    describe('#handleTelemetrySignal', () => {
    });
  },
);
