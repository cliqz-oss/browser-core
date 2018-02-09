/* global chai */
/* global describeModule */
/* global require */

const tldjs = require('tldjs');
const encoding = require('text-encoding');

const TextDecoder = encoding.TextDecoder;
const TextEncoder = encoding.TextEncoder;

let processRawReqFun;

const mockedTS = Date.now();

const DAY_HISTORY_MOCK_MAP = {
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


export default describeModule('history-analyzer/worker/history_proc',
  () => ({
    tldjs: {
      default: tldjs,
    },
    'platform/console': {
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
    'platform/globals': {
      default: {}
    },
    'platform/prefs': {
      get(x, y) { return y; },
    }
  }),
  () => {
    describe('#history_proc', function() {
      let processData;
      beforeEach(function () {
        processData = this.module().default;
        return this.system.import('offers-v2/pattern-matching/pattern-utils').then((mod) => {
          processRawReqFun = mod.default;
        });
      });

      function genRequests(hd) {
        const days = Object.keys(hd);
        const r = {};
        for (let i = 0; i < days.length; i += 1) {
          const d = days[i];
          r[d] = {
            requests: [],
            last_ts: mockedTS
          };
          const urls = hd[d];
          for (let j = 0; j < urls.length; j += 1) {
            r[d].requests.push(processRawReqFun(urls[j]));
          }
        }
        return r;
      }

      function buildData(pid, pList, historyData) {
        const result = {
          patterns_map: {},
          days_queries_map: {},
          history_data_map: genRequests(historyData)
        };
        result.patterns_map[pid] = pList;
        const days = Object.keys(historyData);
        for (let i = 0; i < days.length; i += 1) {
          result.days_queries_map[days[i]] = [pid];
        }
        return result;
      }

      function buildDataMulti(pidMap, historyData) {
        const result = {
          patterns_map: pidMap,
          days_queries_map: {},
          history_data_map: genRequests(historyData)
        };
        const pids = Object.keys(pidMap);
        const days = Object.keys(historyData);
        for (let i = 0; i < days.length; i += 1) {
          result.days_queries_map[days[i]] = pids;
        }
        return result;
      }

      function buildExpected(pid, historyData, matchesMap) {
        const r = {};
        r[pid] = {};
        const days = Object.keys(historyData);
        for (let i = 0; i < days.length; i += 1) {
          r[pid][days[i]] = {
            m: matchesMap[days[i]],
            c: historyData[days[i]].length,
              last_ts: mockedTS
          };
        }
        return r;
      }

      function buildExpectedMulti(pidMap, historyData, matchesMap) {
        const r = {};
        const pids = Object.keys(pidMap);
        for (let i = 0; i < pids.length; i += 1) {
          const pid = pids[i];
          r[pid] = {};
          const days = Object.keys(historyData);
          for (let i = 0; i < days.length; i += 1) {
            r[pid][days[i]] = {
              m: matchesMap[pid][days[i]],
              c: historyData[days[i]].length,
              last_ts: mockedTS
            };
          }
        }
        return r;
      }

      function runSuccess(hp) {
        let r = null;
        try {
          r = hp.processData();
        } catch(e) {
          chai.expect(r, e).not.eq(null);
        }
        return r;
      }

      function run(arg) {
        let result = null;
        try {
          result = processData(arg);
        } catch(e) {
        }
        return result;
      }

      context('basic tests', function () {

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/properly built', function () {
          chai.expect(processData).to.exist;
          chai.expect(processRawReqFun).to.exist;
        });

        it('/invalid arguments cannot process', function () {
          chai.expect(run()).eql(null);
          chai.expect(run({})).eql(null);
          chai.expect(run({patterns_map: {}})).eql(null);
          chai.expect(run({patterns_map: {}, days_queries_map: {}})).eql(null);
          chai.expect(run({patterns_map: {}, days_queries_map: {}, history_data_map: {}})).not.eq(null);
        });

        it('/simple query can be processed', function () {
          const pid = 'p1';
          const pList = [
            '||amazon.de'
          ];
          const data = buildData(pid, pList, DAY_HISTORY_MOCK_MAP);
          const result = run(data);

          const expected = {
              '20170901': 1,
              '20170902': 0,
              '20170903': 0,
              '20170904': 0,
              '20170905': 0
          };
          chai.expect(result).eql(buildExpected(pid, DAY_HISTORY_MOCK_MAP, expected));
        });

        it('/simple query can be processed 2', function () {
          const pid = 'p1';
          const pList = [
            '||amazon.de',
            '||amazon4.de'
          ];
          const data = buildData(pid, pList, DAY_HISTORY_MOCK_MAP);
          const result = run(data);

          const expected = {
              '20170901': 1,
              '20170902': 0,
              '20170903': 0,
              '20170904': 1,
              '20170905': 0
          };
          chai.expect(result).eql(buildExpected(pid, DAY_HISTORY_MOCK_MAP, expected));
        });

        it('/multi query can be processed 1', function () {
          const pidMap = {
            p1: [
              '||amazon.de',
              '||amazon4.de'
            ],
            p2: [
              '||focus3.de'
            ]
          };
          const data = buildDataMulti(pidMap, DAY_HISTORY_MOCK_MAP);
          const result = run(data);

          const expected = {
            p1: {
              '20170901': 1,
              '20170902': 0,
              '20170903': 0,
              '20170904': 1,
              '20170905': 0
            },
            p2: {
              '20170901': 0,
              '20170902': 0,
              '20170903': 1,
              '20170904': 0,
              '20170905': 0
            }
          };
          chai.expect(result, 'check result').eql(buildExpectedMulti(pidMap, DAY_HISTORY_MOCK_MAP, expected));
        });


        // we should check different days for different patterns and ensure we
        // do not get them on the response
        it('/multi query can be processed 2', function () {
          const data = {
            patterns_map: {
              p1: ['||amazon.de', '||focus2.de'],
              p2: ['||amazon2.de', '||focus.de'],
            },
            days_queries_map: {
                '20170901': ['p1'],
                '20170902': ['p2'],
                '20170903': [],
                '20170904': [],
                '20170905': [],
            },
            history_data_map: genRequests(DAY_HISTORY_MOCK_MAP)
          };
          const result = run(data);

          const expected = {
            p1: {
              '20170901': {m: 1, c: 4, last_ts: mockedTS},
            },
            p2: {
              '20170902': {m: 1, c: 4, last_ts: mockedTS}
            }
          };
          chai.expect(result, 'checking result').eql(expected);
        });


      }); // end of context
    }); // end of describe module
  }
);
