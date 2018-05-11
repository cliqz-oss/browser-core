/* global chai */
/* global sinon */
/* global describeModule */


const moment = require('moment');

const CURRENT_DATE = '2017-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';

const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';


function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}


let putDBMock = () => Promise.resolve();
let getDBMock = () => Promise.resolve();

function mockDB({ get, put }) {
  putDBMock = put;
  getDBMock = get;
}


function handleTelemetrySignalMock() {
  return Promise.resolve();
}


export default describeModule('anolysis/anolysis',
  () => ({
    'platform/lib/moment': {
      default: moment,
    },
    'core/helpers/md5': {
      default: arg => arg,
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
    'core/database': {
      default: class Database {
        put(...args) {
          return putDBMock(...args);
        }
        get(...args) {
          return getDBMock(...args);
        }
        info() { return Promise.resolve(); }
        bulkDocs() { return Promise.resolve(); }
        query() {
          return Promise.resolve({
            rows: [],
          });
        }
        close() { return Promise.resolve(); }
      },
    },
    'anolysis/aggregator': {
      default: class BehaviorAggregator {},
    },
    'anolysis/gid-manager': {
      default: class GIDManager {},
    },
    'anolysis/preprocessor': {
      default: class Preprocessor {},
      parseABTests() { return []; },
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

    describe('#registerSchemas', () => {
      it('correctly adds schemas', () => {
        chai.expect(anolysis.availableSchemas.size).to.equal(0);
        return Promise.resolve()
          .then(() => anolysis.registerSchemas({
            signal1: {},
            signal2: {},
          }))
          .then(() => chai.expect(anolysis.availableSchemas.size).to.equal(2))
          .then(() => chai.expect([...anolysis.availableSchemas.entries()]).to.eql([
            ['signal1', {}],
            ['signal2', {}],
          ]));
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
        mockDB({
          get() { return Promise.reject({ name: 'not_found' }); },
          put(doc) {
            if (doc._id !== '_design/index') {
              chai.expect(doc).to.be.eql({
                _id: 'retention',
                daily: { '2017-1': [CURRENT_DATE] },
                weekly: { '2017-52': [CURRENT_DATE] },
                monthly: { '2017-1': ['2017-52'] }
              });
            }
            return Promise.resolve();
          },
        });

        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);

        return anolysis.sendRetentionSignals()
          .then(() => chai.expect(anolysis.handleTelemetrySignal.callCount).to.equal(32));
      });

      it('does not generate retention signals two times', () => {
        const state = {
          _id: 'retention',
          daily: { '2017-1': [CURRENT_DATE] },
          weekly: { '2017-52': [CURRENT_DATE] },
          monthly: { '2017-1': ['2017-52'] }
        };

        mockDB({
          get() {
            return Promise.resolve(state);
          },
          put(doc) {
            if (doc._id !== '_design/index') {
              chai.expect(doc).to.be.eql(state);
            }
            return Promise.resolve();
          },
        });

        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);

        return anolysis.sendRetentionSignals()
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called);
      });
    });

    describe('#generateAnalysesSignalsFromAggregation', () => {
      it('generates signals from empty state', () => {
        const db = [];
        mockDB({
          get() { return Promise.reject({ name: 'not_found' }); },
          put(doc) {
            db.push(doc);
            return Promise.resolve();
          },
        });

        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);

        return anolysis.generateAnalysesSignalsFromAggregation()
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called)
          .then(() => chai.expect(db).to.be.eql([
            { _id: '2016-12-31', ts: '2016-12-31', aggregation: {}},
            { _id: '2016-12-30', ts: '2016-12-30', aggregation: {}},
            { _id: '2016-12-29', ts: '2016-12-29', aggregation: {}},
            { _id: '2016-12-28', ts: '2016-12-28', aggregation: {}},
            { _id: '2016-12-27', ts: '2016-12-27', aggregation: {}},
            { _id: '2016-12-26', ts: '2016-12-26', aggregation: {}},
            { _id: '2016-12-25', ts: '2016-12-25', aggregation: {}},
            { _id: '2016-12-24', ts: '2016-12-24', aggregation: {}},
            { _id: '2016-12-23', ts: '2016-12-23', aggregation: {}},
            { _id: '2016-12-22', ts: '2016-12-22', aggregation: {}},
            { _id: '2016-12-21', ts: '2016-12-21', aggregation: {}},
            { _id: '2016-12-20', ts: '2016-12-20', aggregation: {}},
            { _id: '2016-12-19', ts: '2016-12-19', aggregation: {}},
            { _id: '2016-12-18', ts: '2016-12-18', aggregation: {}},
            { _id: '2016-12-17', ts: '2016-12-17', aggregation: {}},
            { _id: '2016-12-16', ts: '2016-12-16', aggregation: {}},
            { _id: '2016-12-15', ts: '2016-12-15', aggregation: {}},
            { _id: '2016-12-14', ts: '2016-12-14', aggregation: {}},
            { _id: '2016-12-13', ts: '2016-12-13', aggregation: {}},
            { _id: '2016-12-12', ts: '2016-12-12', aggregation: {}},
            { _id: '2016-12-11', ts: '2016-12-11', aggregation: {}},
            { _id: '2016-12-10', ts: '2016-12-10', aggregation: {}},
            { _id: '2016-12-09', ts: '2016-12-09', aggregation: {}},
            { _id: '2016-12-08', ts: '2016-12-08', aggregation: {}},
            { _id: '2016-12-07', ts: '2016-12-07', aggregation: {}},
            { _id: '2016-12-06', ts: '2016-12-06', aggregation: {}},
            { _id: '2016-12-05', ts: '2016-12-05', aggregation: {}},
            { _id: '2016-12-04', ts: '2016-12-04', aggregation: {}},
            { _id: '2016-12-03', ts: '2016-12-03', aggregation: {}},
            { _id: '2016-12-02', ts: '2016-12-02', aggregation: {}},
            { _id: '2016-12-01', ts: '2016-12-01', aggregation: {}},
          ]));
      });

      it('does not generate signals when day is already present', () => {
        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);
        const dbPut = sinon.spy(() => Promise.resolve());
        mockDB({
          get() { return Promise.resolve(); },
          put: dbPut,
        });

        return anolysis.generateAnalysesSignalsFromAggregation()
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called)
          .then(() => chai.expect(dbPut).to.not.have.been.called);
      });
    });

    describe('#generateAndSendAnalysesSignalsForDay', () => {
      it('generates no signals if there is nothing to aggregate', () => {
        anolysis.behaviorStorage.getTypesByTimespan = sinon.spy(() => Promise.resolve({}));
        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);

        return anolysis.generateAndSendAnalysesSignalsForDay()
          .then(() => chai.expect(anolysis.behaviorStorage.getTypesByTimespan).to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called);
      });

      it('generates signals if there are signals for a day', () => {
        anolysis.behaviorStorage.getTypesByTimespan = sinon.spy(() => Promise.resolve({ type: [{}] }));
        anolysis.behaviorAggregator.aggregate = sinon.spy(() => {});
        anolysis.handleTelemetrySignal = sinon.spy(handleTelemetrySignalMock);

        return anolysis.generateAndSendAnalysesSignalsForDay()
          .then(() => chai.expect(anolysis.behaviorStorage.getTypesByTimespan).to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.behaviorAggregator.aggregate).to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.have.been.calledOnce);
      });
    });

    describe('#handleTelemetrySignal', () => {
    });
  },
);
