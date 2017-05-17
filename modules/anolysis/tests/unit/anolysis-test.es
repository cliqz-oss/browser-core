/* global chai */
/* global sinon */
/* global describeModule */


const moment = System._nodeRequire('moment');

const CURRENT_DATE = '2017-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';

const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';


function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}


let putDBMock;
let getDBMock;

function mockDB({ get, put }) {
  putDBMock = put;
  getDBMock = get;
}


export default describeModule('anolysis/anolysis',
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
    'core/cliqz': {
      utils: {
        getPref() {},
        setPref() {},
        setTimeout(fun) { return fun(); },
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
      default: class SignalQueue {},
    },
    'anolysis/storage': {
      default: class Storage {
        getTypesByTimespan() { return Promise.resolve([]); }

      },
    },
    'anolysis/analyses': {
      default: [
        { name: 'fake', generateSignals() { return [{}]; } },
      ],
    },
    'anolysis/logging': {
      default() {},
    },
  }),
  () => {
    let anolysis;

    beforeEach(function importAnolysis() {
      const Anolysis = this.module().default;
      anolysis = new Anolysis();
    });

    describe('#registerSchemas', () => {
      it('correctly adds schemas', () => {
        chai.expect(anolysis.availableSchemas.size).to.equal(0);
        return anolysis.registerSchemas({
          signal1: {},
          signal2: {},
        })
        .then(() => chai.expect(anolysis.availableSchemas.size).to.equal(2))
        .then(() => chai.expect([...anolysis.availableSchemas.entries()]).to.eql([
          ['signal1', {}],
          ['signal2', {}],
        ]));
      });

      it('fails on duplicates', () =>
        chai.expect(
          anolysis.registerSchemas({ signal1: {}, signal2: {} })
          .then(() => anolysis.registerSchemas({ signal1: {} }))
        ).to.be.rejected
      );
    });

    describe('#sendRetentionSignals', () => {
      it('generates retention from empty state', () => {
        mockDB({
          get() { return Promise.reject({ name: 'not_found' }); },
          put(doc) {
            chai.expect(doc).to.be.eql({
              _id: 'retention',
              daily: { '2017-1': [CURRENT_DATE] },
              weekly: { '2017-52': [CURRENT_DATE] },
              monthly: { '2017-1': ['2017-52'] }
            });
            return Promise.resolve();
          },
        });

        anolysis.handleTelemetrySignal = sinon.spy(() => {});

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
            chai.expect(doc).to.be.eql(state);
            return Promise.resolve();
          },
        });

        anolysis.handleTelemetrySignal = sinon.spy(() => {});

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

        anolysis.handleTelemetrySignal = sinon.spy(() => {});

        return anolysis.generateAnalysesSignalsFromAggregation()
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called)
          .then(() => chai.expect(db).to.be.eql([
            { _id: '2016-12-31' },
            { _id: '2016-12-30' },
            { _id: '2016-12-29' },
            { _id: '2016-12-28' },
            { _id: '2016-12-27' },
            { _id: '2016-12-26' },
            { _id: '2016-12-25' },
            { _id: '2016-12-24' },
            { _id: '2016-12-23' },
            { _id: '2016-12-22' },
            { _id: '2016-12-21' },
            { _id: '2016-12-20' },
            { _id: '2016-12-19' },
            { _id: '2016-12-18' },
            { _id: '2016-12-17' },
            { _id: '2016-12-16' },
            { _id: '2016-12-15' },
            { _id: '2016-12-14' },
            { _id: '2016-12-13' },
            { _id: '2016-12-12' },
            { _id: '2016-12-11' },
            { _id: '2016-12-10' },
            { _id: '2016-12-09' },
            { _id: '2016-12-08' },
            { _id: '2016-12-07' },
            { _id: '2016-12-06' },
            { _id: '2016-12-05' },
            { _id: '2016-12-04' },
            { _id: '2016-12-03' },
            { _id: '2016-12-02' },
            { _id: '2016-12-01' },
          ]));
      });

      it('does not generate signals when day is already present', () => {
        anolysis.handleTelemetrySignal = sinon.spy(() => {});
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
        anolysis.behaviorStorage.getTypesByTimespan = sinon.spy(() => Promise.resolve([]));
        anolysis.handleTelemetrySignal = sinon.spy(() => {});

        return anolysis.generateAndSendAnalysesSignalsForDay()
          .then(() => chai.expect(anolysis.behaviorStorage.getTypesByTimespan).to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.not.have.been.called);
      });

      it('generates signals if there are signals for a day', () => {
        anolysis.behaviorStorage.getTypesByTimespan = sinon.spy(() => Promise.resolve([{}]));
        anolysis.behaviorAggregator.aggregate = sinon.spy(() => {});
        anolysis.handleTelemetrySignal = sinon.spy(() => {});

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
