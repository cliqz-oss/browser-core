/* global chai */
/* global describeModule */
/* global require */

let mockedTS = Date.now();

function mockCurrentTS(ts) {
  mockedTS = ts;
}

export default describeModule('offers-v2/history_index',
  () => ({
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
        logObject: () => {},
      }
    },
    'offers-v2/persistent_cache_db': {
      default: class {
        constructor(db, docName, configs) {
          this.db = db;
        }
        destroy() {}
        saveEntries() {}
        loadEntries() { return Promise.resolve(true); }
        setEntryData(eid, data) {
          if (!this.db[eid]) {
          this.db[eid] = {
            c_ts: mockedTS,
            l_u_ts: mockedTS,
            data
          };
          } else {
            this.db[eid].data = data;
            this.db[eid].l_u_ts = mockedTS;
          }
        }
        getEntryContainer(eid)  {
          return this.db[eid];
        }
        getEntryData(eid) {
          if (!this.db[eid]) { return null; }
          return this.db[eid].data;
        }
        markEntryDirty() {}
      }
    },
    'core/platform': {
      isChromium: false
    },
    'core/cliqz': {
      default: {
        setInterval: function () {}
      },
      utils: {
        setInterval: function () {},
      }
    },
    'platform/console': {
      default: {}
    },
    'offers-v2/utils': {
      timestampMS: () => mockedTS,
      timestamp: () => mockedTS
    },
  }),
  () => {
    describe('history index', function() {
      let HistoryIndex;
      let OffersConfigs;

      beforeEach(function () {
        HistoryIndex = this.module().default;
        return Promise.all([
          this.system.import('offers-v2/offers_configs').then(result => {
            OffersConfigs = result.default;
          })
        ]);
      });

      describe('private binary search functions', function () {
        let historyIndex;
        const db = {};
        beforeEach(function () {
          historyIndex = new HistoryIndex(db);
          historyIndex.entries = [
            { url: '0', ts: 2 },
            { url: '1', ts: 3 },
            { url: '2', ts: 4 },
            { url: '3', ts: 4 },
            { url: '4', ts: 6 },
            { url: '5', ts: 7 },
            { url: '6', ts: 7 },
            { url: '7', ts: 8 },
            { url: '8', ts: 9 },
          ];
        });

        it('_leftMostIndex', function () {
          chai.expect(historyIndex._leftMostIndex(10)).eql(-1);
          chai.expect(historyIndex._leftMostIndex(4)).eql(2);
          chai.expect(historyIndex._leftMostIndex(5)).eql(4);
          chai.expect(historyIndex._leftMostIndex(6)).eql(4);
          chai.expect(historyIndex._leftMostIndex(1)).eql(0);
        });

        it('_rightMostIndex', function () {
          chai.expect(historyIndex._rightMostIndex(1)).eql(-1);
          chai.expect(historyIndex._rightMostIndex(7)).eql(6);
          chai.expect(historyIndex._rightMostIndex(5)).eql(3);
          chai.expect(historyIndex._rightMostIndex(6)).eql(4);
          chai.expect(historyIndex._rightMostIndex(10)).eql(8);
        });
      });

      describe('queryHistory', function () {
        let historyIndex;
        const db = {};
        beforeEach(function () {
          historyIndex = new HistoryIndex(db);
          // TODO: should we use addUrl?
          historyIndex.entries = [
            { url: '0', ts: 2 },
            { url: '1', ts: 3 },
            { url: '2', ts: 4 },
            { url: '3', ts: 4 },
            { url: '4', ts: 6 },
            { url: '5', ts: 7 },
            { url: '6', ts: 7 },
            { url: '7', ts: 8 },
            { url: '8', ts: 9 },
          ];
        });

        it('empty results', function () {
          chai.expect(historyIndex.queryHistory(0, 1)).eql([]);
          chai.expect(historyIndex.queryHistory(10, 11)).eql([]);
        });

        it('single result', function () {
          chai.expect(historyIndex.queryHistory(3, 3)).eql([{ url: '1', ts: 3 }]);
          chai.expect(historyIndex.queryHistory(5, 6)).eql([{ url: '4', ts: 6 }]);
        });

        it('include boundary results', function () {
          chai.expect(historyIndex.queryHistory(0, 3)).eql([
            { url: '0', ts: 2 },
            { url: '1', ts: 3 },
          ]);
          chai.expect(historyIndex.queryHistory(8, 11)).eql([
            { url: '7', ts: 8 },
            { url: '8', ts: 9 },
          ]);
        });

        it('middle results only', function () {
          chai.expect(historyIndex.queryHistory(4, 7)).eql([
            { url: '2', ts: 4 },
            { url: '3', ts: 4 },
            { url: '4', ts: 6 },
            { url: '5', ts: 7 },
            { url: '6', ts: 7 },
          ]);
        });
      });
      describe('countHistoryEntries', function () {
        let historyIndex;
        const db = {};
        beforeEach(function () {
          historyIndex = new HistoryIndex(db);
          historyIndex.entries = [
            { url: '0', ts: 2 },
            { url: '1', ts: 3 },
            { url: '1', ts: 4 },
            { url: '2', ts: 4 },
            { url: '3', ts: 4 },
            { url: '4', ts: 6 },
            { url: '5', ts: 7 },
            { url: '6', ts: 7 },
            { url: '1', ts: 8 },
            { url: '8', ts: 9 },
          ];
          historyIndex.cachedCounts.set(12345, {t_start:4, t_end: 6, count: 0});
        });

        it('incorrect time range', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(7, 3, [pattern], id)).eql(0);
        });

        it('one match due to time range', function () {
          const pattern = /1/;
          const id = 12345;
          historyIndex.cachedCounts = new Map();
          historyIndex.cachedCounts.set(12345, {t_start:4, t_end: 6, count: 1});
          chai.expect(historyIndex.countHistoryEntries(4, 6, [pattern], id)).eql(1);
          chai.expect(historyIndex.countHistoryEntries(2, 3, [pattern], id)).eql(1);
        });

        it('no matches' , function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(4, 7, [pattern], id)).eql(0);
        });

        it('multiple pattern match' , function () {
          historyIndex.cachedCounts = new Map();
          const p1= /1/;
          const p2= /3/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(3, 8, [p1, p2], id)).eql(4);
          chai.expect(historyIndex.countHistoryEntries(3, 7, [p1, p2], id)).eql(3);
        });

        it('multiple match due to time range', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(2, 6, [pattern], id)).eql(2);
        });

        it('intersecting time ranges cache is not used', function () {
          const pattern = /1/;
          const id = 12345;
          historyIndex.cachedCounts = new Map();
          chai.expect(historyIndex.countHistoryEntries(2, 7, [pattern], id)).eql(2);
          chai.expect(historyIndex.countHistoryEntries(6, 8, [pattern], id)).eql(1);
        });

        it('disjoint sets', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(0, 6, [pattern], id)).eql(2);
          chai.expect(historyIndex.countHistoryEntries(7, 9, [pattern], id)).eql(1);
        });

        it('cache is embedded in new time range', function () {
          const pattern = /5/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(6, 7, [pattern], id)).eql(1);
          chai.expect(historyIndex.countHistoryEntries(0, 9, [pattern], id)).eql(1);
        });

        it('intersecting time ranges cache is bigger', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(0, 10, [pattern], id)).eql(3);
          chai.expect(historyIndex.countHistoryEntries(6, 9, [pattern], id)).eql(1);
        });

        it('invalid input: t_start is negative', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(-2, 1 , [pattern], id)).eql(0);
        });

        it('invalid input: t_end is negative', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(2, -1, [pattern], id)).eql(0);
        });

        it('invalid input: id is invalid, just set the id to whatever is sent', function () {
          const pattern = /1/;
          const id = 'wrong string';
          chai.expect(historyIndex.countHistoryEntries(2, 6, [pattern], id)).eql(2);
          // check the we do not accumulate garbage
          chai.expect(historyIndex.countHistoryEntries(2, 6, [pattern], id)).eql(2);
        });

        it('cache usage large scale', function () {
          const p1 = /1/;
          const p2 = /2/;
          const id = 999;
          historyIndex.cachedCounts = new Map();
          historyIndex.countHistoryEntries(1, 8, [p1,p2], id);
          historyIndex.countHistoryEntries(1, 8, [p1,p2], id);
          historyIndex.countHistoryEntries(1, 8, [p1,p2], id);
          chai.expect(historyIndex.countHistoryEntries(1, 8, [p1,p2], id)).eql(4);
        });
      });
    });
  }
);
