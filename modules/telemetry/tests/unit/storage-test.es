export default describeModule("telemetry/storage",
  function () {
    return { }
  },
  function () {
    var database;
    var storage;
    beforeEach(function() {
      database = {
        put: () => Promise.resolve(),
        post: () => Promise.resolve(),
        query: () => Promise.resolve(),
      };
      const Storage = this.module().default;
      storage = new Storage(database);
    });
    describe("#put", function () {
      it("should set timestamp (if not provided) of record and put record into database", function () {
        var record;
        database.post = (_record) => {
          record = _record;
          return Promise.resolve();
        };
        return storage.put({ id: 'type_A', value: 5 }).then(() => {
          const ts = record.ts;
          chai.expect(Date.now() - ts).to.be.within(0, 10);
          delete record.ts;
          chai.expect(record).to.be.eql({ id: 'type_A', value: 5 });
        });
      });
      it("should not set timestamp (if provided) of record and put record into database", function () {
        var record;
        database.post = (_record) => {
          record = _record;
          return Promise.resolve();
        };
        return storage.put({ id: 'type_A', value: 5, ts: 99 }).then(() => {
          const ts = record.ts;
          chai.expect(ts).to.equal(99);
          delete record.ts;
          chai.expect(record).to.be.eql({ id: 'type_A', value: 5 });
        });
      });
    });
    describe("#getByTimespan", function () {
      it("should query database with correct index & timespan and extract documents", function () {
        var index;
        var params;
        database.query = (_index, _params) => {
          index = _index;
          params = _params;
          return Promise.resolve({
            rows: [
              { doc: { id: 'type_A', value: 1 } },
              { doc: { id: 'type_B', value: 1 } },
              { doc: { id: 'type_A', value: 2 } },
            ]
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
            { id: 'type_A', value: 1 },
            { id: 'type_A', value: 2 },
            { id: 'type_B', value: 1 },
            ],
          );
        });
      });
    });
    describe("#deleteByTimespan", function () {
      it("should query database with correct documents & timespan", function () {
        var documents = [];
        var params;
        database.query = (_index, _params) => {
          return Promise.resolve({
            rows: [
              { doc: { id: 'type_A', value: 1 } },
              { doc: { id: 'type_B', value: 1 } },
              { doc: { id: 'type_A', value: 2 } },
            ]
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
            { id: 'type_A', value: 1 },
            { id: 'type_A', value: 2 },
            { id: 'type_B', value: 1 },
            ],
          );
        });
      });
    });
    describe("#getTypesByTimespan", function () {
      it("should query database with correct index & timespan and group records by type", function () {
        var index;
        var params;
        database.query = (_index, _params) => {
          index = _index;
          params = _params;
          return Promise.resolve({
            rows: [
              { doc: { id: 'type_A', value: 1 } },
              { doc: { id: 'type_B', value: 1 } },
              { doc: { id: 'type_A', value: 2 } },
            ]
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
              { id: 'type_A', value: 1 },
              { id: 'type_A', value: 2 },
            ],
            type_B: [
              { id: 'type_B', value: 1 },
            ],
          });
        });
      });
    });
  }
)
