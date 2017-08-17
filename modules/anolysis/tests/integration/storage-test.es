/* global chai */
/* global describeModule */


const PouchDB = System._nodeRequire('pouchdb');
const moment = System._nodeRequire('moment');

const DATE_FORMAT = 'YYYY-MM-DD';
const getCurrentMoment = () => moment('2017-01-01', DATE_FORMAT);
const getFormattedCurrentDate = () => getCurrentMoment().format(DATE_FORMAT);


export default describeModule('anolysis/storage',
  () => ({
    'anolysis/synchronized-date': {
      DATE_FORMAT,
      default() {
        return getCurrentMoment();
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
    let database;
    let storage;

    beforeEach(function initDatabase() {
      database = new PouchDB('cliqz-test-anolysis-integration-storage', { db: System._nodeRequire('memdown') });
      const Storage = this.module().default;
      storage = new Storage(database);
    });

    afterEach(() => database.destroy());


    describe('put and getTypesByTimespan', () => {
      it('should return records given complete timespan with records', () => {
        const timespan = {
          from: getFormattedCurrentDate(),
          to: getFormattedCurrentDate(),
        };

        return storage.put({ type: 'type_A', value: 5 })
          .then(() => storage.put({ type: 'type_B', value: 6 }))
          .then(() => storage.put({ type: 'type_A', value: 7 }))
          .then(() => storage.getTypesByTimespan(timespan))
          .then((records) => {
            chai.expect(records).to.contain.all.keys(['type_A', 'type_B']);
            chai.expect(records.type_A.length).to.equal(2);
            chai.expect(records.type_B.length).to.equal(1);
            chai.expect(records.type_A[0].value).to.equal(5);
            chai.expect(records.type_A[1].value).to.equal(7);
            chai.expect(records.type_B[0].value).to.equal(6);
          });
      });
      it('should return records given from timestamp with records', () => {
        const timespan = {
          from: getFormattedCurrentDate(),
        };

        return storage.put({ type: 'type_A', value: 5 })
          .then(() => storage.getTypesByTimespan(timespan))
          .then((records) => {
            chai.expect(records).to.contain.all.keys(['type_A']);
            chai.expect(records.type_A.length).to.equal(1);
            chai.expect(records.type_A[0].value).to.equal(5);
          });
      });
      it('should return records given from timestamp with records', () => {
        const timespan = {
          to: getFormattedCurrentDate(),
        };

        return storage.put({ type: 'type_A', value: 5 })
          .then(() => storage.getTypesByTimespan(timespan))
          .then((records) => {
            chai.expect(records).to.contain.all.keys(['type_A']);
            chai.expect(records.type_A.length).to.equal(1);
            chai.expect(records.type_A[0].value).to.equal(5);
          });
      });
      it('should return empty object given complete timespan without records', () => {
        const previousDay = getCurrentMoment().subtract(1, 'days').format(DATE_FORMAT);
        const timespan = {
          from: previousDay,
          to: previousDay,
        };

        return storage.put({ type: 'type_A', value: 5 })
          .then(() => storage.getByTimespan(timespan))
          .then((records) => chai.expect(records).to.be.empty);
      });
      it('should return empty object given from timespan without records', () => {
        const nextDay = getCurrentMoment().add(1, 'days').format(DATE_FORMAT);
        const timespan = {
          from: nextDay,
        };

        return storage.put({ type: 'type_A', value: 5 })
          .then(() => storage.getByTimespan(timespan))
          .then((records) => chai.expect(records).to.be.empty);
      });
    });
    describe('put, deleteByTimespan, and getByTimespan', () => {
      it('should delete all records given (complete) timespan', () => {
        const timespan = {
          from: 0,
          to: 300,
        };

        return storage.put({ type: 'type_A', value: 5, ts: 0 })
          .then(() => storage.put({ type: 'type_B', value: 6, ts: 100 }))
          .then(() => storage.put({ type: 'type_A', value: 7, ts: 200 }))
          .then(() => storage.deleteByTimespan(timespan))
          .then(() => storage.getByTimespan({ from: 0, to: 1000 }))
          .then((records) => {
            chai.expect(records).to.have.length.of(0);
          });
      });
      it('should delete some records given (complete) timespan', () => {
        const timespan = {
          from: 100,
          to: 102,
        };

        return storage.put({ type: 'type_A', value: 5, ts: 1 })
          .then(() => storage.put({ type: 'type_B', value: 6, ts: 100 }))
          .then(() => storage.put({ type: 'type_B', value: 6, ts: 102 }))
          .then(() => storage.put({ type: 'type_A', value: 7, ts: 200 }))
          .then(() => storage.deleteByTimespan(timespan))
          .then(() => storage.getByTimespan({ from: 0, to: 1000 }))
          .then((documents) => {
            chai.expect(documents).to.have.length.of(2);
            chai.expect(documents[0].ts).to.equal(1);
            chai.expect(documents[1].ts).to.equal(200);
          });
      });
      it('should delete records up to `to` of given timespan', () => {
        const timespan = {
          to: 500,
        };

        return storage.put({ type: 'type_A', value: 5, ts: 1 })
          .then(() => storage.put({ type: 'type_B', value: 6, ts: 500 }))
          .then(() => storage.put({ type: 'type_A', value: 7, ts: 501 }))
          .then(() => storage.deleteByTimespan(timespan))
          .then(() => storage.getByTimespan({ from: 0, to: 1000 }))
          .then((documents) => {
            chai.expect(documents).to.have.length(1);
            chai.expect(documents[0].ts).to.equal(501);
          });
      });
      it('should delete records from `from` of given timespan', () => {
        const timespan = {
          from: 500,
        };

        return storage.put({ type: 'type_A', value: 5, ts: 1 })
          .then(() => storage.put({ type: 'type_B', value: 6, ts: 500 }))
          .then(() => storage.put({ type: 'type_A', value: 7, ts: 501 }))
          .then(() => storage.deleteByTimespan(timespan))
          .then(() => storage.getByTimespan({ from: 0, to: 1000 }))
          .then((documents) => {
            chai.expect(documents).to.have.length(1);
            chai.expect(documents[0].ts).to.equal(1);
          });
      });
    });

    describe('put, getN and getLastN', () => {
      it('getLastN should return the last record', () => {
        const n = 1;

        return storage.put({ ts: 1, order: 5 })
          .then(() => storage.put({ ts: 2, order: 6 }))
          .then(() => storage.put({ ts: 3, order: 7 }))
          .then(() => storage.put({ ts: 4, order: 8 }))
          .then(() => storage.put({ ts: 5, order: 9 }))
          .then(() => storage.put({ ts: 6, order: 10 }))
          .then(() => storage.put({ ts: 7, order: 11 }))
          .then(() => storage.put({ ts: 8, order: 12 }))
          .then(() => storage.getLastN(n))
          .then((records) => {
            chai.expect(records).to.have.length(1);
            chai.expect(records[0].order).to.equal(12);
          });
      });

      it('getLastN should return the 3 last records', () => {
        const n = 3;

        return storage.put({ ts: 5, order: 5 })
          .then(() => storage.put({ ts: 6, order: 6 }))
          .then(() => storage.put({ ts: 7, order: 7 }))
          .then(() => storage.put({ ts: 8, order: 8 }))
          .then(() => storage.put({ ts: 9, order: 9 }))
          .then(() => storage.put({ ts: 10, order: 10 }))
          .then(() => storage.put({ ts: 11, order: 11 }))
          .then(() => storage.put({ ts: 12, order: 12 }))
          .then(() => storage.getLastN(n))
          .then((records) => {
            chai.expect(records).to.have.length(3);
            chai.expect(records[0].order).to.equal(12);
            chai.expect(records[1].order).to.equal(11);
            chai.expect(records[2].order).to.equal(10);
          });
      });

      it('getN should return 1 records', () => {
        const n = 1;

        return storage.put({ type: 'type_A', value: 5 })
          .then(() => storage.put({ type: 'type_B', value: 6 }))
          .then(() => storage.put({ type: 'type_A', value: 7 }))
          .then(() => storage.getN(n))
          .then((records) => {
            chai.expect(records).to.have.length(1);
            chai.expect(records[0]).to.have.property('type');
            chai.expect(records[0]).to.have.property('value');
          });
      });

      it('getN should return 3 records', () => {
        const n = 4;

        return storage.put({ type: 'type_A', value: 5 })
          .then(() => storage.put({ type: 'type_B', value: 6 }))
          .then(() => storage.put({ type: 'type_A', value: 7 }))
          .then(() => storage.getN(n))
          .then((records) => {
            chai.expect(records).to.have.length(3);
            records.forEach((record) => {
              chai.expect(record).to.have.property('type');
              chai.expect(record).to.have.property('value');
            });
          });
      });
    });
  },
);
