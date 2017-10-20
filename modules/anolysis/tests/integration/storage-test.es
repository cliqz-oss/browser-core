/* global chai */
/* global describeModule */


const PouchDB = require('pouchdb');
const moment = require('moment');

const DATE_FORMAT = 'YYYY-MM-DD';
const getCurrentMoment = () => moment('2017-01-01', DATE_FORMAT);
const getFormattedCurrentDate = () => getCurrentMoment().format(DATE_FORMAT);


export default describeModule('anolysis/storage',
  () => ({
    'core/database': {
      default: class Database {
        constructor(name) {
          const dbName = `cliqz-test-integration-${name}`;

          this.db = new PouchDB(
            dbName,
            { db: require('memdown') });
        }
        destroy(...args) {
          return this.db.destroy(...args);
        }
        put(...args) {
          return this.db.put(...args);
        }
        get(...args) {
          return this.db.get(...args);
        }
        query(...args) {
          return this.db.query(...args);
        }
        info() {
          return this.db.info();
        }
        remove(...args) {
          return this.db.remove(...args);
        }
        allDocs(...args) {
          return this.db.allDocs(...args);
        }
        bulkDocs(...args) {
          return this.db.bulkDocs(...args);
        }
      },
    },
    'core/cliqz': {
      utils: {
        setTimeout(cb) { cb(); },
        setInterval() {},
      },
    },
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
        error(...args) { console.log('ERROR', ...args); },
      },
    },
  }),
  () => {
    let storage;

    beforeEach(function initDatabase() {
      const Storage = this.module().default;
      storage = new Storage('anolysis-storage-test-integration');
      return storage.init();
    });

    afterEach(() => storage.destroy());


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
          .then(records => chai.expect(records).to.be.empty);
      });
      it('should return empty object given from timespan without records', () => {
        const nextDay = getCurrentMoment().add(1, 'days').format(DATE_FORMAT);
        const timespan = {
          from: nextDay,
        };

        return storage.put({ type: 'type_A', value: 5 })
          .then(() => storage.getByTimespan(timespan))
          .then(records => chai.expect(records).to.be.empty);
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
            chai.expect(records).to.have.lengthOf(0);
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
            chai.expect(documents).to.have.lengthOf(2);
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
  },
);
