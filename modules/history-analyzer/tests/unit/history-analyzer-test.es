/* global chai */
/* global describeModule */
/* global require */

const encoding = require('text-encoding');

const TextDecoder = encoding.TextDecoder;
const TextEncoder = encoding.TextEncoder;

class HistoryInterfaceMock {
  constructor() {
    this.toRet = {};
    this.lastQuery = null;
  }

  setData(d) {
    this.toRet = d;
  }

  getHistoryForKeyDays(keyDaysList) {
    this.lastQuery = keyDaysList;
    return this.toRet;
  }

  clear() {
    this.toRet = {};
  }
}

// mocked variables
let mockedTS = Date.now();
let todayDayKetMock = 20151121;
let getDaysFromTimeRangeResult = [];
let getDaysFromTimeRangeArg = null;
let getDateFromDateKeyResult = null;
let persistFlag = true;

const GENERIC_MOCK_DATA = {
  '20170901': { places: [
      'https://google.de',
      'https://focus.de',
      'https://amazon.de',
      'https://pizza.de',
    ], last_ts: mockedTS},
  '20170902': { places: [
      'https://google2.de',
      'https://focus2.de',
      'https://amazon2.de',
      'https://pizza2.de',
    ], last_ts: mockedTS},
  '20170903': { places: [
      'https://google3.de',
      'https://focus3.de',
      'https://amazon3.de',
      'https://pizza3.de',
    ], last_ts: mockedTS},
  '20170904': { places: [
      'https://google4.de',
      'https://focus4.de',
      'https://amazon4.de',
      'https://pizza4.de',
    ], last_ts: mockedTS },
  '20170905': { places: [], last_ts: mockedTS},
};


export default describeModule('history-analyzer/history_handler',
  () => ({
    'core/platform': {
      isChromium: false
    },
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
    'platform/gzip': {
      default: {}
    },
    'platform/globals': {
      default: {}
    },
    'platform/environment': {
      default: {}
    },
    'core/cliqz': {
      utils: {
        setInterval: function () {},
        getPref(n,v) { return v; },
      }
    },
    'core/utils': {
      default: {
        setInterval: function () {},
      }
    },
    'core/prefs': {
      default: {
        get: function(x, y) {
          if (x === 'historyAnalyzerEnabled') {
            return true;
          }
          if (x === 'historyAnalyzerPersistFlag') {
            return persistFlag;
          }
          return y;
        },
      }
    },
    'platform/console': {
    },
    'core/crypto/random': {
      default: () => {
        return Math.floor(Math.random());
      },
    },
    'history-analyzer/logger': {
      default: {
        log: function(x) {console.log(x)},
        error: function(x) {console.error(x)},
      }
    },
    'core/persistence/simple-db': {
      default: class {
        constructor(db) {
          this.db = db;
        }

        upsert(docID, docData) {
          if (!docID) {
            return Promise.resolve(false);
          }
          const self = this;
          return new Promise((resolve, reject) => {
            self.db[docID] = JSON.parse(JSON.stringify(docData));
            resolve();
          });
        }

        get(docID) {
          if (!docID) {
            return Promise.resolve(null);
          }
          const self = this;
          return new Promise((resolve, reject) => {
            resolve(JSON.parse(JSON.stringify(self.db[docID])));
          });
        }

        remove(docID) {
          if (!docID) {
            return Promise.resolve(false);
          }
          const self = this;
          return new Promise((resolve, reject) => {
            if (self.db[docID]) {
              delete self.db[docID];
            }
            resolve(true);
          });
        }
      }
    },
    'core/time': {
      getDaysFromTimeRange: function(startTS, endTS) {
        getDaysFromTimeRangeArg = [startTS, endTS];
        return getDaysFromTimeRangeResult;
      },
      getDateFromDateKey: function(dateKey, hours = 0, min = 0, seconds = 0) {
        return getDateFromDateKeyResult;
      },
      timestamp: function() {
        return mockedTS;
      },
      getTodayDayKey: function() {
        return todayDayKetMock;
      }
    },
    'history-analyzer/history_worker': {
      default: class {
        constructor(historyProcInterface) {
          // console.log('###### history_worker mock created');
          this.historyProcInterface = historyProcInterface;
          this.msgCb = null;
          this.mockCB = null;
        }
        setHistoryProcInterface(hpi) {
          this.historyProcInterface = hpi;
          this.historyProcInterface.setRespCallback(this._mockCallback.bind(this));
        }
        setOnmessageCb(fn) {
          this.msgCb = fn;
        }
        postMessage(args) {
          // console.log('###### posting message on the worker');
          this.historyProcInterface.onMessage({ data: args });
        }
        terminate() {
        }
        setMockCallback(cb) {
          this.mockCB = cb;
        }
        _mockCallback(args) {
          // console.log('######### reply called ', args);
          const data = { data: args };
          if (this.msgCb) {
            this.msgCb(data)
          }
          if (this.mockCB) {
            this.mockCB(data);
          }
        }
      }
    },
  }),
  () => {
    describe('#history_handler', function() {
      let HistoryHandler;
      let HistoryProcMsgHandler;
      beforeEach(function () {
        HistoryHandler = this.module().default;
        const hpmh = this.system.import('history-analyzer/worker/history_proc_msg_handler');
        const pList = [hpmh];
        return Promise.all(pList).then((mods) => {
          HistoryProcMsgHandler = mods[0].default;
        });
      });

      context('basic tests', function () {
        let hh;
        let hiMock;
        let wMock;
        let db;
        beforeEach(function () {
          db = {}
          hiMock = new HistoryInterfaceMock();
          hh = new HistoryHandler(hiMock, db);
          hiMock = hh.historyInterface;
          wMock = hh.worker;
          chai.expect(wMock).to.exist;
          wMock.setHistoryProcInterface(new HistoryProcMsgHandler());

          // reset variables
          mockedTS = Date.now();
          getDaysFromTimeRangeResult = [];
          getDateFromDateKeyResult = null;
          getDaysFromTimeRangeArg = null;
          todayDayKetMock = 20151121;
        });

        function configMock(dayUrlsMap) {
          const days = Object.keys(dayUrlsMap);
          getDaysFromTimeRangeResult = [];
          for (let i = 0; i < days.length; i += 1) {
            getDaysFromTimeRangeResult.push(days[i]);
          }
          hiMock.setData(dayUrlsMap);
        }

        function cloneData(d) {
          return JSON.parse(JSON.stringify(d));
        }

        function executeAndWaitResult(qList, numCallbacks = 1) {
          return new Promise((resolve, reject) => {
            // call the background here and wait for the result
            qList.forEach((q) => {
              hh.addQuery(q);
            });
            let cbResults = [];
            const cb = (msg) => {
              // we got a callback, we should return here or wait for the callbacks?
              cbResults.push(msg);
            };
            hh.addCallback(cb);
            hh.processTasks();
            const startTime = Date.now();
            function wait() {
              if ((Date.now() - startTime) > 2000) {
                resolve(null);
                hh.removeCallback(cb);
                return;
              } else if (cbResults.length >= numCallbacks) {
                resolve(cbResults);
                hh.removeCallback(cb);
                return;
              } else {
                setTimeout(wait, 1);
              }
            }
            wait();
          });
        }

        /**
         * will check if the give pid exists and at least
         * the dayMap (day => {m: N, c: Y}) exists in the cached
         * data.
         * @param  {[type]} pid    [description]
         * @param  {[type]} dayMap [description]
         * @return {[type]}        [description]
         */
        function checkAtLeast(pid, dayMap) {
          chai.expect(hh.hasEntryInCache(pid)).eql(true);
          const ed = hh.getEntryData(pid);
          chai.expect(ed).to.exist;
          const dd = ed.getData().match_data.per_day;
          const keysToCheck = Object.keys(dayMap);
          for (let i = 0; i < keysToCheck.length; i += 1) {
            const ktc = keysToCheck[i];
            chai.expect(dd[ktc]).to.exist;
            if (!!dayMap[ktc].c) {
              chai.expect(dd[ktc].c, `counts for ${ktc} are not the same`).eql(dayMap[ktc].c);
            }
            if (!!dayMap[ktc].m) {
              chai.expect(dd[ktc].m, `matches for ${ktc} are not the same`).eql(dayMap[ktc].m);
            }
          }
        }

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/basic check', function () {
          const qs = [
            {start_ms: 0, end_ms: 10000000, pid: 'test-pid', patterns: ['||google.de']}
          ];
          const expected = {
            '20170901': { c: 4, m: 1},
            '20170902': { c: 4, m: 0}
          };
          configMock(GENERIC_MOCK_DATA);
          return executeAndWaitResult(qs, 1).then((r) => {
            chai.expect(r).to.exist;
            chai.expect(r.length).eql(1);
            checkAtLeast('test-pid', expected);
          });
        });

        it('/basic check for 2 queries', function () {
          const qs = [
            {start_ms: 0, end_ms: 10000000, pid: 'test-pid', patterns: ['||google.de']},
            {start_ms: 0, end_ms: 10000000, pid: 'test-pid2', patterns: ['||google2.de']}
          ];
          const expected1 = {
            '20170901': { c: 4, m: 1},
            '20170902': { c: 4, m: 0},
            '20170903': { c: 4, m: 0},
            '20170904': { c: 4, m: 0},
            '20170905': { c: 0, m: 0}
          };
          const expected2 = {
            '20170901': { c: 4, m: 0},
            '20170902': { c: 4, m: 1},
            '20170903': { c: 4, m: 0},
            '20170904': { c: 4, m: 0},
            '20170905': { c: 0, m: 0}
          };
          configMock(GENERIC_MOCK_DATA);
          return executeAndWaitResult(qs, 2).then((r) => {
            chai.expect(r).to.exist;
            chai.expect(r.length).eql(2);
            checkAtLeast('test-pid', expected1);
            checkAtLeast('test-pid2', expected2);
          });
        });

        it('/basic check for 2 queries and multi patterns', function () {
          const qs = [
            {start_ms: 0, end_ms: 10000000, pid: 'test-pid', patterns: ['||google.de', '||amazon.de', '||amazon2.de']},
            {start_ms: 0, end_ms: 10000000, pid: 'test-pid2', patterns: ['||google2.de', '||google4.de']}
          ];
          const expected1 = {
            '20170901': { c: 4, m: 2},
            '20170902': { c: 4, m: 1},
            '20170903': { c: 4, m: 0},
            '20170904': { c: 4, m: 0},
            '20170905': { c: 0, m: 0}
          };
          const expected2 = {
            '20170901': { c: 4, m: 0},
            '20170902': { c: 4, m: 1},
            '20170903': { c: 4, m: 0},
            '20170904': { c: 4, m: 1},
            '20170905': { c: 0, m: 0}
          };
          configMock(GENERIC_MOCK_DATA);
          return executeAndWaitResult(qs, 2).then((r) => {
            chai.expect(r).to.exist;
            chai.expect(r.length).eql(2);
            checkAtLeast('test-pid', expected1);
            checkAtLeast('test-pid2', expected2);
          });
        });

        it('/cache is working', function () {
          const qs = [
            {start_ms: 0, end_ms: 10000000, pid: 'test-pid', patterns: ['||google.de']}
          ];
          const expected = {
            '20170901': { c: 4, m: 1},
            '20170902': { c: 4, m: 0}
          };
          configMock(GENERIC_MOCK_DATA);
          return executeAndWaitResult(qs, 1).then((r) => {
            chai.expect(r).to.exist;
            chai.expect(r.length).eql(1);
            checkAtLeast('test-pid', expected);
            // now run it again but changing the mock data of the history interface
            // assuming this should never happen (the history cannot change only
            // be deleted => we re do all)
            const newMockData = {
              '20170906': {
                places: [
                  'https://google.de',
                  'https://google.de',
                  'https://google.de',
                  'https://google.de',
                  'https://google.de',
                  'https://google.de'
                ],
                last_ts: mockedTS
              }
            };
            configMock(newMockData);
            return executeAndWaitResult(qs, 1).then((r) => {
              chai.expect(r).to.exist;
              chai.expect(r.length).eql(1);
              chai.expect(hiMock.lastQuery.length).eql(1);
              chai.expect(hiMock.lastQuery).eql(['20170906']);
              // is still the same data
              checkAtLeast('test-pid', expected);
              // also check we have the new day
              checkAtLeast('test-pid', { '20170906': { m: 6, c: 6 } });
            });
          });
        });

        it('/cache is working after reloading data', function () {
          const qs = [
            {start_ms: 0, end_ms: 10000000, pid: 'test-pid', patterns: ['||google.de']}
          ];
          const expected = {
            '20170901': { c: 4, m: 1},
            '20170902': { c: 4, m: 0}
          };
          configMock(GENERIC_MOCK_DATA);
          return executeAndWaitResult(qs, 1).then((r) => {
            chai.expect(r).to.exist;
            chai.expect(r.length).eql(1);
            checkAtLeast('test-pid', expected);
            checkAtLeast('test-pid', expected);
            chai.expect(hh.hasEntryInCache('test-pid'), 'first have').eql(true);
            hh.savePersistentData().then(() => {
              hiMock = new HistoryInterfaceMock();
              hh = new HistoryHandler(hiMock, db);
              // check data is not here yet
              chai.expect(hh.hasEntryInCache('test-pid'), 'second has not').eql(false);
              return hh.loadPersistentData().then(() => {
                // data still exists
                chai.expect(hh).eql({});
                chai.expect(hh.hasEntryInCache('test-pid'), 'has it after loading').eql(true);
                checkAtLeast('test-pid', expected);
              });
            });
          });
        });

        it('/multiple queries of the same type works', function () {
          const qs = [
            {start_ms: 0, end_ms: 10000000, pid: 'test-pid', patterns: ['||google.de']},
            {start_ms: 0, end_ms: 20000000, pid: 'test-pid', patterns: ['||google.de']}
          ];
          const expected = {
            '20170901': { c: 4, m: 1},
            '20170902': { c: 4, m: 0}
          };
          configMock(GENERIC_MOCK_DATA);
          return executeAndWaitResult(qs, 1).then((r) => {
            chai.expect(r).to.exist;
            chai.expect(r.length).eql(1);
            checkAtLeast('test-pid', expected);
          });
        });

        // TESTS TO IMPLEMENT
        // - save / load cache works fine
        // - multiple queries of the same type are properly merged (check days we get are proper)
        // - check if one query ask for the proper data and calls the history processor
        //   with the proper information
        // - check if multiple queries are combined properly and asked the history
        //   processor with the proper data
        // - check the cache is working properly (persistent and not persistent)
        // - check if the callbacks are properly called
        // - check failure handling when the worker cannot process a task
        // - check failure when history interface doesnt work
        // - check if state is properly working when shutting down the module
        //   and loading the state from the persistent data

      }); // end of context
    }); // end of describe module
  }
);
