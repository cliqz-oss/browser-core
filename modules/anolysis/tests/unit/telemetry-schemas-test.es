/* global chai */
/* global sinon */
/* global describeModule */

const Dexie = require('dexie');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
const UAParser = require('ua-parser-js');
const ajv = require('ajv');
const faker = require('json-schema-faker');
const indexedDB = require('fake-indexeddb');
const moment = require('moment');
const stats = require('simple-statistics');

const CURRENT_DATE = '2018-10-01';
const DATE_FORMAT = 'YYYY-MM-DD';

const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';

let anolysis;

function initDexie(name) {
  return new Dexie(name, {
    indexedDB,
    IDBKeyRange,
  });
}

/**
 * Given a valid JSON schema, generat `n` random examples from it.
 */
function generateSamples(name, schema, n) {
  const samples = [];
  for (let i = 0; i < n; i += 1) {
    const sample = faker(schema);
    if (sample.type === undefined) {
      sample.type = name;
    }
    samples.push(sample);
  }
  return samples;
}

/**
 *
 */
function testAnalysis(name, schema) {
  // If the given analysis expects to receive an aggregation of signal as
  // argument (function `generate` has length > 0), then we generate fake random
  // signals from the `_source_schema`, which specifies the shape of signals to
  // be aggregated for this analysis.
  let signals = [];
  if (schema.generate !== undefined &&
      schema.generate.length > 0 &&
      schema._source_schema !== undefined
  ) {
    signals = generateSamples(name, schema._source_schema, 50);
  }

  // We expect the analysis to generate at least one signal. If valid (the
  // schema has been successfully validated), the signal(s) should be pushed
  // into the signal queue. We make sure that happens.
  const telemetrySignals = [];
  anolysis.signalQueue.push = sinon.spy((s) => {
    if (s.type === name) {
      telemetrySignals.push(s.behavior);
    }
    return Promise.resolve();
  });

  // We push all random signals to Anolysis (using `handleTelemetrySignal`).
  // Since their schema specifies that they are `instantPush = false`, they will
  // be stored for later aggregation.
  //
  // We then force the aggregation of the daily signals, and expect the message
  // queue to receive at least one signal.
  return Promise.all(signals.map(signal => anolysis.handleTelemetrySignal(signal /* , name */)))
    .then(() => anolysis.sendRetentionSignals())
    .then(() => anolysis.generateAndSendAnalysesSignalsForDay(CURRENT_DATE))
    .then(() => chai.expect(telemetrySignals).to.not.be.empty);
}


function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}

let MOCK_PREFS = new Map();

/**
 * This module tests each schema in isolation by registering it, generating fake
 * data, aggregating the fake data and pushing signals to the siqual queue
 * (after schemas have been checked). It ensures that telemetry schemas work
 * end-to-end.
 */
export default describeModule('anolysis/telemetry-schemas',
  () => ({
    'platform/lib/dexie': {
      default: () => Promise.resolve(initDexie),
    },
    'platform/lib/simple-statistics': {
      default: stats,
    },
    'platform/lib/moment': {
      default: moment,
    },
    'platform/lib/ua-parser': {
      default: UAParser,
    },
    'platform/lib/ajv': {
      default: ajv,
    },
    'core/crypto/random': {
      randomInt() { return 0; },
    },
    'core/events': {
      default: {
        subscribe() {
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
        setInterval() {},
        clearTimeout() { },
      },
    },
    'core/prefs': {
      default: {
        get: (k, d) => (MOCK_PREFS.has(k) ? MOCK_PREFS.get(k) : d),
      }
    },
    'core/database': {
      default: class Database { destroy() { return Promise.resolve(); } },
    },
    'anolysis/gid-manager': {
      default: class GIDManager {
        init() {
          return Promise.resolve();
        }
        getNewInstallDate() { return '2000-01-01'; }
        getGID() {
          return Promise.resolve();
        }
      },
    },
    'anolysis/signals-queue': {
      default: class SignalQueue {
        init() { return Promise.resolve(); }
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
    let availableSchemas;

    beforeEach(function importAnolysis() {
      availableSchemas = this.module().default;
      return this.system.import('anolysis/anolysis')
        .then((module) => {
          const Anolysis = module.default;
          anolysis = new Anolysis();
          MOCK_PREFS = new Map();
        }).then(() => anolysis.init())
          .then(() => anolysis.registerSchemas(availableSchemas));
    });

    afterEach(() => anolysis.storage.destroy());

    describe('Test analyses', () => {
      [
        'cliqztab_settings',
        'cliqztab_state',
        'mobile_results_rendered',
        // 'mobile_swipe',
        // 'mobile_result_selection',
        'result_selection',
        'retention_daily',
        'retention_monthly',
        'retention_weekly',
      ].forEach((name) => {
        it(`Generate signals for ${name}`, () =>
          testAnalysis(name, availableSchemas[name])
        );
      });
    });
  },
);
