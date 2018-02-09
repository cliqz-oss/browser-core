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
    return Promise.resolve(this.toRet);
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

const GENERIC_MOCK_DATA = {
  '20170901': [
    'https://google.de',
    'https://focus.de',
    'https://amazon.de',
    'https://pizza.de',
  ],
  '20170902': [
    'https://google2.de',
    'https://focus2.de',
    'https://amazon2.de',
    'https://pizza2.de',
  ],
  '20170903': [
    'https://google3.de',
    'https://focus3.de',
    'https://amazon3.de',
    'https://pizza3.de',
  ],
  '20170904': [
    'https://google4.de',
    'https://focus4.de',
    'https://amazon4.de',
    'https://pizza4.de',
  ],
  '20170905': [],
};

const WORKER_MOCK_REPLY = {"msg_type":"task-finished","d":{"task_id":"8ecab0c9-543c-045f-318a-6ebf0d6e26c5","results":{"q1":{"20170820":{"c":0,"m":0},"20170821":{"c":7,"m":0},"20170822":{"c":0,"m":0},"20170823":{"c":34,"m":0},"20170824":{"c":0,"m":0},"20170825":{"c":7,"m":0},"20170826":{"c":0,"m":0},"20170827":{"c":0,"m":0},"20170828":{"c":2,"m":0},"20170829":{"c":0,"m":0},"20170830":{"c":0,"m":0},"20170831":{"c":0,"m":0},"20170901":{"c":0,"m":0},"20170902":{"c":0,"m":0},"20170903":{"c":0,"m":0},"20170904":{"c":0,"m":0},"20170905":{"c":0,"m":0},"20170906":{"c":0,"m":0},"20170907":{"c":0,"m":0},"20170908":{"c":0,"m":0},"20170909":{"c":0,"m":0},"20170910":{"c":0,"m":0},"20170911":{"c":0,"m":0},"20170912":{"c":0,"m":0},"20170913":{"c":0,"m":0},"20170914":{"c":0,"m":0},"20170915":{"c":2,"m":0},"20170916":{"c":0,"m":0},"20170917":{"c":0,"m":0},"20170918":{"c":0,"m":0}}}}};


export default describeModule('history-analyzer/history_handler',
  () => ({
    'core/platform': {
      isChromium: false
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
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
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
        get: function(x, y) { return y; },
      }
    },
    'platform/console': {
    },
    'core/crypto/random': {
      default: () => {
        return Math.floor(Math.random());
      },
    },
    // /////////////////////////////////////////////////////////////////////////
    //
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
        constructor() {
          this.pmsg = null;
          this.cb = null;
        }
        setOnmessageCb(fn) {
          this.cb = fn;
        }
        postMessage(args) {
          this.pmsg = args;
        }
        terminate() {
        }
        sendMsgToCb(msg) {
          this.cb(msg);
        }
        clear() {
          this.pmsg = null;
          this.cb = null;
        }
      }
    },
  }),
  () => {
    describe('#history_handler', function() {
      let HistoryHandler;
      beforeEach(function () {
        HistoryHandler = this.module().default;
      });

      context('basic tests', function () {
        let hh;
        let db;
        let hiMock;
        let wMock;
        beforeEach(function () {
          db = {}
          hiMock = new HistoryInterfaceMock();
          hh = new HistoryHandler(hiMock, db);
          wMock = hh.worker;

          chai.expect(wMock).to.exist;

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

        function cmpDays(mockData, daysQueryList) {
          const days = Object.keys(mockData);
          chai.expect(days).eql(daysQueryList);
        }

        function checkQueryDays(s, e) {
          chai.expect(getDaysFromTimeRangeArg).to.exist;
          chai.expect(getDaysFromTimeRangeArg[0]).eql(s);
          chai.expect(getDaysFromTimeRangeArg[1]).eql(e);
        }

        function checkWorkerQuery(q, md, wq) {
         // * {
         // *   msg_type: 'process-task' | any other?
         // *   d: {
         // *     task_id: task.task_id,
         // *     // the pattern id pointing to the patterns we should match for this one
         // *     patterns_map: task.patterns_map,
         // *     days_queries_map: task.days_queries_map,
         // *     history_data_map: historyDataMap
         // *   }
         // * }
         chai.expect(wq).to.exist;
         chai.expect(wq.msg_type).eql('process-task');
         chai.expect(wq.d).to.exist;
         chai.expect(wq.d.task_id).to.exist;
         chai.expect(wq.d.patterns_map).to.exist;
         chai.expect(wq.d.days_queries_map).to.exist;
         chai.expect(wq.d.history_data_map).to.exist;
         chai.expect(wq.d.patterns_map[q.pid]).eql(q.patterns);

         const days = Object.keys(wq.d.days_queries_map);
         const expectedDays = Object.keys(md);
         chai.expect(days).eql(expectedDays);
         for (let i = 0; i < days.length; i += 1) {
            const d = days[i];
            const qids = wq.d.days_queries_map[d];
            chai.expect(qids.length).eql(1);
            chai.expect(qids[0]).eql(q.pid);
         }

         chai.expect(wq.d.history_data_map).eql(md);
        }

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/cannot add invalid queries', function () {
          function checkOrExcept(a) {
            try {
              return hh.addQuery(a);
            } catch(e) {
              return false;
            }
          }
          chai.expect(checkOrExcept()).eql(false);
          chai.expect(checkOrExcept({})).eql(false);
          chai.expect(checkOrExcept({start_ms: 0})).eql(false);
          chai.expect(checkOrExcept({start_ms: 0, end_ms: 1})).eql(false);
          chai.expect(checkOrExcept({start_ms: 0, end_ms: 1, pid: 'asd'})).eql(false);
          chai.expect(checkOrExcept({start_ms: 10, end_ms: 1, pid: 'asd', patterns: []})).eql(false);
          chai.expect(checkOrExcept({start_ms: 0, end_ms: 1, pid: 'asd', patterns: ['a']})).eql(true);
        });

        xit('/simple query', function () {
          // configure mock
          configMock(GENERIC_MOCK_DATA);

          const q = {start_ms: 0, end_ms: 1, pid: 'asd', patterns: []};
          chai.expect(hh.addQuery(q)).eql(true);
          return hh.processTasks().then((r) => {
            // check the days query are the expected ones
            checkQueryDays(0, 1);
            // check we query the interface properly
            cmpDays(GENERIC_MOCK_DATA, hiMock.lastQuery);
            // check that the format of the query to the worker is the proper one
            checkWorkerQuery(q, GENERIC_MOCK_DATA, wMock.pmsg);
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
