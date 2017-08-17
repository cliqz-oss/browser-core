/* global chai */
/* global sinon */
/* global describeModule */


const PouchDB = System._nodeRequire('pouchdb');
const UAParser = System._nodeRequire('ua-parser-js');
const moment = System._nodeRequire('moment');
const fs = System._nodeRequire('fs');

const CURRENT_DATE = '2017-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';

const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';


let anolysis;

let openedDB = [];


/**
 * Read signals from file
 */
function readSignals(type) {
  return fs.readFileSync(`modules/anolysis/tests/integration/data/${type}`, 'utf8')
    .split(/\n/)
    .filter(l => l.length > 0)
    .map(JSON.parse);
}


/**
 * Simulates the result of the aggregation on one key
 */
function stats(n) {
  return {
    numbers: {
      count: n,
      mean: 'mean',
      median: 'median',
      stdev: 'stdev',
      min: 'min',
      max: 'max',
    },
    nulls: {
      count: 0
    }
  };
}


function testAnalysis(analysisName, signals, expected) {
  // Workflow
  // 1. Load fake telemetry signals
  // 2. Init anolysis (which should trigger loading of analyses, etc.)
  // 3. Feed fake signals into anolysis
  // 4. Trigger aggregation of signals + generation via analyses
  // 5. Intercept result of analyses
  // 6. Compare to what we expect.

  anolysis.availableSchemas = {
    get() {
      return {
        needs_gid: false,
        instantPush: true,
      };
    }
  };

  const telemetrySignals = [];

  // Mock handling of telemetry signals
  anolysis.messageQueue.push = sinon.spy((s) => {
    if (s.id === analysisName) {
      const newSignal = Object.create(null);

      Object.keys(s.behavior)
        .filter(k => k !== 'meta')
        .forEach((key) => {
          newSignal[key] = s.behavior[key];
        });

      telemetrySignals.push(newSignal);
    }
  });

  return Promise.all(signals.map(signal => anolysis.handleTelemetrySignal(signal)))
    .then(() => anolysis.generateAndSendAnalysesSignalsForDay(CURRENT_DATE))
    .then(() => chai.expect(telemetrySignals).to.be.eql(expected));
}


function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}


export default describeModule('anolysis/anolysis',
  () => ({
    'platform/moment': {
      default: moment,
    },
    'platform/ua-parser': {
      default: UAParser,
    },
    'core/crypto/random': {
      randomInt() { return 0; },
    },
    'core/events': {
      default: {
        subscript() {
          return {
            unsubscribe() {},
          };
        },
      },
    },
    'anolysis/synchronized-date': {
      DATE_FORMAT,
      DAY_FORMAT,
      WEEK_FORMAT,
      MONTH_FORMAT,
      default() {
        return getCurrentDate();
      },
    },
    'core/cliqz': {
      utils: {
        getPref(name, defaultValue) {
          if (name === 'ABTests') {
            return '{}';
          }

          return defaultValue;
        },
        setPref() {},
        setTimeout(fun) { return fun(); },
        clearTimeout() { },
      },
    },
    'core/database': {
      default: class Database {
        constructor(name) {
          const dbName = `cliqz-test-integration-${name}`;

          this.db = new PouchDB(
            dbName,
            { db: System._nodeRequire('memdown') });

          openedDB.push(this.db);
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
      },
    },
    'anolysis/simple-statistics': {
      default: {
        mean() { return 'mean'; },
        median() { return 'median'; },
        standardDeviation() { return 'stdev'; },
        min() { return 'min'; },
        max() { return 'max'; },
      },
    },
    'anolysis/gid-manager': {
      default: class GIDManager {
        getGID() {
          return Promise.resolve();
        }
      },
    },
    'anolysis/signals-queue': {
      default: class SignalQueue { },
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
    beforeEach(function importAnolysis() {
      const Anolysis = this.module().default;
      anolysis = new Anolysis();
    });

    afterEach(() => Promise.all(openedDB.map(d => d.destroy())).then(() => {
      openedDB = [];
    }));

    describe('Test analyses', () => {
      it('Generate signals for result_selection', () => testAnalysis('result_selection',
        readSignals('result_selection'),
        [
          {
            count: 1,
            keys: {
              type: {
                count: 1,
                categories: {
                  result_selection_click: 1
                }
              },
              current_position: {
                count: 1,
                categories: {
                  0: 1
                }
              },
              query_length: stats(1),
              reaction_time: stats(1),
              display_time: stats(1),
            }
          },
          {
            count: 2,
            keys: {
              type: {
                count: 2,
                categories: {
                  result_selection_enter: 2
                }
              },
              current_position: {
                count: 2,
                categories: {
                  0: 1,
                  1: 1
                }
              },
              query_length: stats(2),
              reaction_time: stats(2),
              display_time: stats(2),
              urlbar_time: stats(2),
            }
          },
          {
            count: 1,
            keys: {
              type: {
                count: 1,
                categories: {
                  result_selection_url: 1
                }
              },
              current_position: stats(1),
              query_length: stats(1),
              reaction_time: stats(1),
              display_time: stats(1),
              urlbar_time: stats(1),
            }
          }
        ],
      ));
    });
  },
);
