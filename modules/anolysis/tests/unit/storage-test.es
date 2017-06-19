/* global chai */
/* global describeModule */


const moment = System._nodeRequire('moment');

const DATE_FORMAT = 'YYYY-MM-DD';
const getCurrentMoment = () => moment('2017-01-01', DATE_FORMAT);


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
    beforeEach(function resetStorageMock() {
      database = {
        put: () => Promise.resolve(),
        post: () => Promise.resolve(),
        query: () => Promise.resolve(),
      };
      const Storage = this.module().default;
      storage = new Storage(database);
    });
    describe('#put', () => {
      it('should set timestamp (if not provided) of record and put record into database', () => {
        let record;
        database.put = (_record) => {
          record = _record;
          return Promise.resolve();
        };
        return storage.put({ type: 'type_A', value: 5 }).then(() => {
          const ts = record.ts;
          chai.expect(ts).to.be.equal(getCurrentMoment().format(DATE_FORMAT));
          delete record.ts;
          delete record._id;
          chai.expect(record).to.be.eql({ type: 'type_A', value: 5 });
        });
      });
      it('should not set timestamp (if provided) of record and put record into database', () => {
        let record;
        database.put = (_record) => {
          record = _record;
          return Promise.resolve();
        };
        return storage.put({ type: 'type_A', value: 5, ts: 99 }).then(() => {
          const ts = record.ts;
          chai.expect(ts).to.equal(99);
          delete record.ts;
          delete record._id;
          chai.expect(record).to.be.eql({ type: 'type_A', value: 5 });
        });
      });
    });
    describe('#getByTimespan', () => {
      it('should query database with correct index & timespan and extract documents', () => {
        let index;
        let params;
        database.query = (_index, _params) => {
          index = _index;
          params = _params;
          return Promise.resolve({
            rows: [
              { doc: { behavior: { type: 'type_A', value: 1 } } },
              { doc: { behavior: { type: 'type_B', value: 1 } } },
              { doc: { behavior: { type: 'type_A', value: 2 } } },
            ],
          });
        };
        return storage.getByTimespan({ from: 1, to: 100 }).then((records) => {
          chai.expect(index, 'queried wrong index').to.be.equal('index/by_ts');
          chai.expect(params, 'used incorrect query parameters').to.be.eql({
            startkey: 1,
            endkey: 100,
            include_docs: true,
          });
          chai.expect(records, 'documents not extracted').to.deep.have.members([
            { behavior: { type: 'type_A', value: 1 } },
            { behavior: { type: 'type_A', value: 2 } },
            { behavior: { type: 'type_B', value: 1 } },
          ]);
        });
      });
    });
    describe('#deleteByTimespan', () => {
      it('should query database with correct documents & timespan', () => {
        const documents = [];
        // let params;
        database.query = (_index, _params) => {
          return Promise.resolve({
            rows: [
              { doc: { behavior: { type: 'type_A', value: 1 } } },
              { doc: { behavior: { type: 'type_B', value: 1 } } },
              { doc: { behavior: { type: 'type_A', value: 2 } } },
            ],
          });
        };
        // database.bulkDocs = (_documents, _params) => {
        //   documents = _documents;
        //   params = _params;
        // };
        database.remove = _document => Promise.resolve(documents.push(_document));
        return storage.deleteByTimespan({ from: 1, to: 100 }).then(() => {
          // chai.expect(params, 'used incorrect query parameters').to.be.eql({
          //   _deleted: true,
          // });
          chai.expect(documents, 'documents not passed on').to.deep.have.members([
            { behavior: { type: 'type_A', value: 1 } },
            { behavior: { type: 'type_A', value: 2 } },
            { behavior: { type: 'type_B', value: 1 } },
          ]);
        });
      });
    });
    describe('#getTypesByTimespan', () => {
      it('should query database with correct index & timespan and group records by type', () => {
        let index;
        let params;
        database.query = (_index, _params) => {
          index = _index;
          params = _params;
          return Promise.resolve({
            rows: [
              { doc: { behavior: { type: 'type_A', value: 1 } } },
              { doc: { behavior: { type: 'type_B', value: 1 } } },
              { doc: { behavior: { type: 'type_A', value: 2 } } },
            ],
          });
        };
        return storage.getTypesByTimespan({ from: 1, to: 100 }).then((records) => {
          chai.expect(index, 'queried wrong index').to.be.equal('index/by_ts');
          chai.expect(params, 'used incorrect query parameters').to.be.eql({
            startkey: 1,
            endkey: 100,
            include_docs: true,
          });
          chai.expect(records, 'not grouped by type').to.be.eql({
            type_A: [
              { behavior: { type: 'type_A', value: 1 } },
              { behavior: { type: 'type_A', value: 2 } },
            ],
            type_B: [
              { behavior: { type: 'type_B', value: 1 } },
            ],
          });
        });
      });
    });
  },
);
