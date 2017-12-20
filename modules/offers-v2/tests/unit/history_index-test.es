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
        debug: (x) => {/* console.log(x); */},
        error: (x) => {console.error(x);},
        info: (x) => {/* console.log(x); */},
        log: (x) => {/* console.log(x); */},
        warn: (x) => {/* console.error(x); */},
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

      function addHistoryData(hh, d) {
        d.forEach((e) => {
          mockedTS = e.ts;
          hh.addUrl(e.url, {});
        });
      }
      function countMatches(d, pp, start, end) {
        let count = 0;
        d.forEach((e) => {
          if (e.ts >= start && e.ts <= end) {
            pp.forEach((pattern) => {
              const r = new RegExp(pattern);
              if (r.test(e.url)) {
                count += 1;
              }
            });
          }
        });
        return count;
      }

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
        const ENTRIES = [
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

        beforeEach(function () {
          historyIndex = new HistoryIndex(db);
          addHistoryData(historyIndex, ENTRIES);
          //historyIndex.cachedCounts.set(12345, {t_start:4, t_end: 6, count: 0});
        });

        function checkRange(start, end, p, id) {
          chai.expect(historyIndex.countHistoryEntries(start, end, p, id),
                      `checking range: [${start}, ${end}] failed`)
                      .eql(countMatches(historyIndex.entries, p, start, end))
        }

        it('last entry test', function () {
          const pattern = /8/;
          historyIndex.entries = [
            { url: '8', ts: 9 },
          ];
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(0, 9, [pattern], id)).eql(1);
        });

        it('last entry test', function () {
          const pattern = /8/;
          historyIndex.entries = [
            { url: '8', ts: 9 },
          ];
          const id = 12345;
          chai.expect(historyIndex.countHistoryEntries(9, 9, [pattern], id)).eql(1);
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
          const pattern = /0/;
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

        // deep tests
        it('/counthistory deep tests', function () {
          const baseTS = 100;
          const entries = [
            { url: 'http://amazon1.com', ts: baseTS + 1 },
            { url: 'http://amazon2.com', ts: baseTS + 2 },
            { url: 'http://amazon3.com', ts: baseTS + 3 },
            { url: 'http://amazon4.com', ts: baseTS + 4 },
            { url: 'http://amazon5.com', ts: baseTS + 5 },
            { url: 'http://amazon6.com', ts: baseTS + 6 },
            { url: 'http://amazon7.com', ts: baseTS + 7 },
            { url: 'http://amazon8.com', ts: baseTS + 8 },
            { url: 'http://amazon9.com', ts: baseTS + 9 },
          ];
          const patterns = [
            /amazon1/,
            /amazon2/,
            /amazon3/
          ];
          addHistoryData(historyIndex, entries);
          // historyIndex.countHistoryEntries(baseTS + 0, baseTS + 8, patterns, 'x');
          chai.expect(historyIndex.countHistoryEntries(baseTS + 0, baseTS + 8, patterns, 'x'), '0 to 8').eql(3);
          chai.expect(historyIndex.countHistoryEntries(baseTS + 0, baseTS + 9, patterns, 'x'), '0 to 9').eql(3);
          chai.expect(historyIndex.countHistoryEntries(baseTS + 0, baseTS + 7, patterns, 'x'), '0 to 7').eql(3);
          chai.expect(historyIndex.countHistoryEntries(baseTS + 0, baseTS + 6, patterns, 'x'), '0 to 6').eql(3);
          chai.expect(historyIndex.countHistoryEntries(baseTS + 1, baseTS + 7, patterns, 'x'), '1 to 7').eql(3);
          chai.expect(historyIndex.countHistoryEntries(baseTS + 2, baseTS + 7, patterns, 'x'), '2 to 7').eql(2);
          chai.expect(historyIndex.countHistoryEntries(baseTS + 3, baseTS + 7, patterns, 'x'), '3 to 7').eql(1);
          chai.expect(historyIndex.countHistoryEntries(baseTS + 4, baseTS + 7, patterns, 'x'), '4 to 7').eql(0);
        });

        it('/counthistory jumping tests', function () {
          const baseTS = 100;
          const entries = [
            { url: 'http://amazon1.com', ts: baseTS + 1 },
            { url: 'http://amazon2.com', ts: baseTS + 2 },
            { url: 'http://amazon1.com', ts: baseTS + 3 },
            { url: 'http://amazon4.com', ts: baseTS + 4 },
            { url: 'http://amazon1.com', ts: baseTS + 5 },
            { url: 'http://amazon6.com', ts: baseTS + 6 },
            { url: 'http://amazon1.com', ts: baseTS + 7 },
            { url: 'http://amazon8.com', ts: baseTS + 8 },
            { url: 'http://amazon1.com', ts: baseTS + 9 },
            { url: 'http://amazon9.com', ts: baseTS + 10 },
            { url: 'http://amazon1.com', ts: baseTS + 11 },
            { url: 'http://amazon9.com', ts: baseTS + 12 },

          ];
          const patterns = [
            /amazon1/,
            /amazon22/,
            /amazon32/
          ];
          addHistoryData(historyIndex, entries);
          for (let i = 0; i < 10; i += 2) {
            chai.expect(historyIndex.countHistoryEntries(baseTS + i, baseTS + i + 1, patterns, 'x')).eql(1);
          }
          for (let i = 0; i < 10; i += 4) {
            chai.expect(historyIndex.countHistoryEntries(baseTS + i, baseTS + i + 4, patterns, 'x')).eql(2);
          }
          for (let i = 0; i < 6; i += 6) {
            chai.expect(historyIndex.countHistoryEntries(baseTS + i, baseTS + i + 6, patterns, 'x')).eql(3);
          }
        });

        it('/counthistory no intersection', function () {
          const p = [/1/, /2/];
          const id = 999;
          chai.expect(historyIndex.countHistoryEntries(0, 5, p, id)).eql(3);
          chai.expect(historyIndex.countHistoryEntries(6, 11, p, id)).eql(1);
          chai.expect(historyIndex.countHistoryEntries(0, 5, p, id)).eql(3);
          chai.expect(historyIndex.countHistoryEntries(6, 11, p, id)).eql(1);
        });

        it('/counthistory increasing cache', function () {
          const p = [/1/, /2/];
          const id = 999;
           chai.expect(historyIndex.countHistoryEntries(4, 4, p, id)).eql(2);
          chai.expect(historyIndex.countHistoryEntries(3, 6, p, id)).eql(3);
          chai.expect(historyIndex.countHistoryEntries(2, 7, p, id)).eql(3);
          chai.expect(historyIndex.countHistoryEntries(0, 9, p, id)).eql(4);
        });

        it('/counthistory decreasing cache', function () {
          const p = [/1/, /2/];
          const id = 999;
          const ranges = [
            [0, 10],
            [2, 9],
            [3, 8],
            [4, 7],
            [6, 6]
          ];
          ranges.forEach(r => checkRange(r[0], r[1], p, id));
        });

        it('/overlaping moving ranges', function () {
          const p = [/1/, /2/];
          const id = 999;
          let ranges = [];
          for (let overlap = 0; overlap < 10; overlap += 1) {
            for (let i = 0; i < 10; i += 1) {
              ranges.push([i, i-overlap]);
            }
          }
          ranges.forEach(r => checkRange(r[0], r[1], p, id));
        });

        it('/increasing moving ranges', function () {
          const p = [/1/, /2/];
          const id = 999;
          // add some extra data
          const totalNewEntries = 100;
          const possibilities = 10;
          mockedTS = ENTRIES[ENTRIES.length - 1].ts + 1;
          for (let i = 0; i < totalNewEntries; i += 1) {
            const url = `${Math.floor(Math.random() * possibilities)}`;
            mockedTS += 1;
            historyIndex.addUrl(url, {});
          }
          const numEntries = totalNewEntries + ENTRIES.length;
          const mid = numEntries / 2;
          for (let i = 0; i < numEntries; i += 1) {
            const start = mid - numEntries;
            const end = mid + numEntries;
            checkRange(start, end, p, id);
          }
          for (let i = 0; i < numEntries; i += 1) {
            const start = mid - numEntries;
            const end = mid + numEntries;
            checkRange(start, end, p, id);
          }
        });


      });
    });
  }
);
