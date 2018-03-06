/* global chai */
/* global describeModule */
/* global require */

const encoding = require('text-encoding');

const TextDecoder = encoding.TextDecoder;
const TextEncoder = encoding.TextEncoder;

let mockedTS = Date.now();

function mockCurrentTS(ts) {
  mockedTS = ts;
}

export default describeModule('offers-v2/pattern-matching/memory-history-handler',
  () => ({
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: (...args) => {/* console.error(...args) */},
        info: (...args) => {console.log(...args)},
        log: () => {},
        warn: () => {},
        logObject: () => {},
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
        setInterval: function () {}
      }
    },
    'core/helpers/timeout': {
      default: function() { const stop = () => {}; return { stop }; }
    },
    'core/crypto/random': {
    },
    'platform/console': {
      default: {}
    },
    'platform/globals': {
      default: {}
    },
    'offers-v2/utils': {
      timestampMS: () => mockedTS,
      timestamp: () => mockedTS
    },
  }),
  () => {
    describe('#memory-history-handler', function() {
      let MemoryHistoryHandler;
      beforeEach(function () {
        MemoryHistoryHandler = this.module().default;
      });

      function matchObj(urlData, patterns) {
        for (let i = 0; i < patterns.length; i += 1) {
          const re = new RegExp(patterns[i]);
          if (re.test(urlData)) {
            return true;
          }
        }
        return false;
      }

      function addHistoryData(hh, d) {
        d.forEach((e) => {
          mockedTS = e.ts;
          hh.addTokenizedUrl(e.url);
        });
      }
      function countMatches(d, pp, start, end) {
        let count = 0;
        d.forEach((e) => {
          if (e.ts >= start && e.ts <= end) {
            pp.forEach((pattern) => {
              const r = new RegExp(pattern);
              if (r.test(e.urlData)) {
                count += 1;
              }
            });
          }
        });
        return count;
      }

      context('basic tests', function () {
        let memHistoryIndex;
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
          memHistoryIndex = new MemoryHistoryHandler(matchObj);
          addHistoryData(memHistoryIndex, ENTRIES);
          //memHistoryIndex.cachedCounts.set(12345, {t_start:4, t_end: 6, count: 0});
        });

        function checkRange(start, end, p, id) {
          chai.expect(memHistoryIndex.countMatches(start, end, p, id),
                      `checking range: [${start}, ${end}] failed`)
                      .eql(countMatches(memHistoryIndex.entries, p, start, end))
        }

        it('last entry test', function () {
          const pattern = /8/;
          memHistoryIndex.entries = [
            { urlData: '8', ts: 9 },
          ];
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(0, 9, [pattern], id)).eql(1);
        });

        it('last entry test', function () {
          const pattern = /8/;
          memHistoryIndex.entries = [
            { urlData: '8', ts: 9 },
          ];
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(9, 9, [pattern], id)).eql(1);
        });

        it('incorrect time range', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(7, 3, [pattern], id)).eql(0);
        });

        it('one match due to time range', function () {
          const pattern = /1/;
          const id = 12345;
          memHistoryIndex.cachedCounts = new Map();
          memHistoryIndex.cachedCounts.set(12345, {t_start:4, t_end: 6, count: 1});
          chai.expect(memHistoryIndex.countMatches(4, 6, [pattern], id)).eql(1);
          chai.expect(memHistoryIndex.countMatches(2, 3, [pattern], id)).eql(1);
        });

        it('no matches' , function () {
          const pattern = /0/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(4, 7, [pattern], id)).eql(0);
        });

        it('multiple pattern match' , function () {
          memHistoryIndex.cachedCounts = new Map();
          const p1= /1/;
          const p2= /3/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(3, 8, [p1, p2], id)).eql(4);
          chai.expect(memHistoryIndex.countMatches(3, 7, [p1, p2], id)).eql(3);
        });

        it('multiple match due to time range', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(2, 6, [pattern], id)).eql(2);
        });

        it('intersecting time ranges cache is not used', function () {
          const pattern = /1/;
          const id = 12345;
          memHistoryIndex.cachedCounts = new Map();
          chai.expect(memHistoryIndex.countMatches(2, 7, [pattern], id)).eql(2);
          chai.expect(memHistoryIndex.countMatches(6, 8, [pattern], id)).eql(1);
        });

        it('disjoint sets', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(0, 6, [pattern], id)).eql(2);
          chai.expect(memHistoryIndex.countMatches(7, 9, [pattern], id)).eql(1);
        });

        it('cache is embedded in new time range', function () {
          const pattern = /5/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(6, 7, [pattern], id)).eql(1);
          chai.expect(memHistoryIndex.countMatches(0, 9, [pattern], id)).eql(1);
        });

        it('intersecting time ranges cache is bigger', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(0, 10, [pattern], id)).eql(3);
          chai.expect(memHistoryIndex.countMatches(6, 9, [pattern], id)).eql(1);
        });

        it('invalid input: t_start is negative', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(-2, 1 , [pattern], id)).eql(0);
        });

        it('invalid input: t_end is negative', function () {
          const pattern = /1/;
          const id = 12345;
          chai.expect(memHistoryIndex.countMatches(2, -1, [pattern], id)).eql(0);
        });

        it('invalid input: id is invalid, just set the id to whatever is sent', function () {
          const pattern = /1/;
          const id = 'wrong string';
          chai.expect(memHistoryIndex.countMatches(2, 6, [pattern], id)).eql(2);
          // check the we do not accumulate garbage
          chai.expect(memHistoryIndex.countMatches(2, 6, [pattern], id)).eql(2);
        });

        it('cache usage large scale', function () {
          const p1 = /1/;
          const p2 = /2/;
          const id = 999;
          memHistoryIndex.cachedCounts = new Map();
          memHistoryIndex.countMatches(1, 8, [p1,p2], id);
          memHistoryIndex.countMatches(1, 8, [p1,p2], id);
          memHistoryIndex.countMatches(1, 8, [p1,p2], id);
          chai.expect(memHistoryIndex.countMatches(1, 8, [p1,p2], id)).eql(4);
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
          addHistoryData(memHistoryIndex, entries);
          // memHistoryIndex.countMatches(baseTS + 0, baseTS + 8, patterns, 'x');
          chai.expect(memHistoryIndex.countMatches(baseTS + 0, baseTS + 8, patterns, 'x'), '0 to 8').eql(3);
          chai.expect(memHistoryIndex.countMatches(baseTS + 0, baseTS + 9, patterns, 'x'), '0 to 9').eql(3);
          chai.expect(memHistoryIndex.countMatches(baseTS + 0, baseTS + 7, patterns, 'x'), '0 to 7').eql(3);
          chai.expect(memHistoryIndex.countMatches(baseTS + 0, baseTS + 6, patterns, 'x'), '0 to 6').eql(3);
          chai.expect(memHistoryIndex.countMatches(baseTS + 1, baseTS + 7, patterns, 'x'), '1 to 7').eql(3);
          chai.expect(memHistoryIndex.countMatches(baseTS + 2, baseTS + 7, patterns, 'x'), '2 to 7').eql(2);
          chai.expect(memHistoryIndex.countMatches(baseTS + 3, baseTS + 7, patterns, 'x'), '3 to 7').eql(1);
          chai.expect(memHistoryIndex.countMatches(baseTS + 4, baseTS + 7, patterns, 'x'), '4 to 7').eql(0);
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
          addHistoryData(memHistoryIndex, entries);
          for (let i = 0; i < 10; i += 2) {
            chai.expect(memHistoryIndex.countMatches(baseTS + i, baseTS + i + 1, patterns, 'x')).eql(1);
          }
          for (let i = 0; i < 10; i += 4) {
            chai.expect(memHistoryIndex.countMatches(baseTS + i, baseTS + i + 4, patterns, 'x')).eql(2);
          }
          for (let i = 0; i < 6; i += 6) {
            chai.expect(memHistoryIndex.countMatches(baseTS + i, baseTS + i + 6, patterns, 'x')).eql(3);
          }
        });

        it('/counthistory no intersection', function () {
          const p = [/1/, /2/];
          const id = 999;
          chai.expect(memHistoryIndex.countMatches(0, 5, p, id)).eql(3);
          chai.expect(memHistoryIndex.countMatches(6, 11, p, id)).eql(1);
          chai.expect(memHistoryIndex.countMatches(0, 5, p, id)).eql(3);
          chai.expect(memHistoryIndex.countMatches(6, 11, p, id)).eql(1);
        });

        it('/counthistory increasing cache', function () {
          const p = [/1/, /2/];
          const id = 999;
          chai.expect(memHistoryIndex.countMatches(4, 4, p, id)).eql(2);
          chai.expect(memHistoryIndex.countMatches(3, 6, p, id)).eql(3);
          chai.expect(memHistoryIndex.countMatches(2, 7, p, id)).eql(3);
          chai.expect(memHistoryIndex.countMatches(0, 9, p, id)).eql(4);
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
            memHistoryIndex.addTokenizedUrl(url);
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
