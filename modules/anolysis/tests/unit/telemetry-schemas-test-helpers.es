/* global chai */
/* global sinon */
/* global describeModule */

/**
 * This modules exports a helper function used to test individual analyses. The
 * function takes as argument an object with three attributes (the last one,
 * `tests`, is optional).
 * - `name`: name of the analysis which is being tested.
 * - `metrics`: list of metrics which the analysis depends on.
 * - `tests`: is a function which takes one argument (generateAnalysisResults)
 *   and can define arbitrary tests.
 *
 * Please read anolysis/README.md for more information. You can also have a look
 * into `anolysis/tests/unit/analyses` for examples.
 */


const mockDexie = require('../../core/unit/utils/dexie');
const UAParser = require('ua-parser-js');
const ajv = require('ajv');
const faker = require('json-schema-faker');
const moment = require('moment');
const stats = require('simple-statistics');

const DATE_FORMAT = 'YYYY-MM-DD';
const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';

/**
 * Given a valid JSON schema, generat `n` random examples from it.
 */
function generateSamples(schema, n) {
  const samples = [];
  for (let i = 0; i < n; i += 1) {
    samples.push(faker(schema));
  }
  return samples;
}

function onlyKeepAnalysisWithName(availableDefinitions, name, metrics = []) {
  // Only keep analysis `name` (the one we want to tests) and metrics it
  // depends upon in the `availableDefinitions` Map. This makes sure we only
  // start generation of signal for the analysis we intend to test.
  [...availableDefinitions.entries()].forEach(([schemaName, schema]) => {
    if (
      schema.generate !== undefined &&
      schemaName !== name &&
      metrics.indexOf(schemaName) === -1
    ) {
      availableDefinitions.delete(schemaName);
    }
  });
}


async function generateAnalysisResults({
  name,
  availableDefinitions,
  anolysis,
  currentDate,
  metrics,
}) {
  const schema = availableDefinitions.get(name);

  // We expect the analysis to generate at least one signal. If valid (the
  // schema has been successfully validated), the signal(s) should be pushed
  // into the signal queue. We make sure that happens.
  const telemetrySignals = [];

  const addBehavior = anolysis.storage.behavior.add.bind(anolysis.storage.behavior);
  // eslint-disable-next-line no-param-reassign
  anolysis.storage.behavior.add = (metric) => {
    if (metric.type === name) {
      telemetrySignals.push(metric.behavior);
    }
    return addBehavior(metric);
  };

  // eslint-disable-next-line no-param-reassign
  anolysis.signalQueue.push = sinon.spy((s) => {
    if (s.type === name) {
      // Check metadata creation
      chai.expect(s.meta.version).to.be.eql(schema.version);
      chai.expect(s.meta.dev).to.be.true;
      chai.expect(s.meta.date).to.be.eql(currentDate);

      if (schema.needsGid) {
        chai.expect(s.meta.gid).to.be.eql('gid');
      } else {
        chai.expect(s.meta.gid).to.be.eql('');
      }

      telemetrySignals.push(s.behavior);
    }
    return Promise.resolve();
  });

  const pushedSignalsPromises = [];

  // If the given analysis expects to receive an aggregation of signal as
  // argument (function `generate` has length > 0), then we generate fake
  // random signals from the schema, which specifies the shape of signals to
  // be aggregated for this analysis.
  const numberOfSignals = 10;
  if (schema.generate !== undefined &&
    schema.generate.length > 0
  ) {
    if (metrics.forEach !== undefined) {
      // If this is an array, it means we got a list of metrics' names. Then
      // we randomly generate signals from their schemas.
      metrics.forEach((metricSchema) => {
        pushedSignalsPromises.push(...generateSamples(
          availableDefinitions.get(metricSchema).schema,
          numberOfSignals,
        ).map(s => anolysis.handleTelemetrySignal(s, metricSchema)));
      });
    } else {
      // Otherwise we expect an object which keys are names of metrics, and
      // values are arrays of signals from these metrics. They are used as is.
      Object.keys(metrics).forEach((metric) => {
        pushedSignalsPromises.push(...metrics[metric].map(
          s => anolysis.handleTelemetrySignal(s, metric)
        ));
      });
    }
  }

  // We push all random signals to Anolysis (using `handleTelemetrySignal`).
  // Since their schema specifies that they are `sendToBackend = false`, they will
  // be stored for later aggregation.
  //
  // We then force the aggregation of the daily signals, and expect the message
  // queue to receive at least one signal.
  await Promise.all(pushedSignalsPromises);
  await anolysis.updateRetentionState();
  await anolysis.runTasksForDay(currentDate, 0);
  await anolysis.runTasksForDay(currentDate, 1);

  return telemetrySignals;
}


module.exports = ({ name, metrics, currentDate, mock, tests, retentionState }) => describeModule('anolysis/telemetry-schemas',
  () => ({
    ...mockDexie,
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
    'core/utils': {
      default: {},
    },
    'core/prefs': {
      default: {
        get: (k, d) => {
          if (k === 'developer') {
            return true;
          } else if (k === 'session') {
            return 'session';
          }
          return d;
        },
        set() {},
        has() {},
        clear() {},
      },
    },
    'anolysis/internals/synchronized-date': {
      DATE_FORMAT,
      DAY_FORMAT,
      WEEK_FORMAT,
      MONTH_FORMAT,
      getSynchronizedDateFormatted() {
        return currentDate || '2018-10-01';
      },
      default() {
        return moment(currentDate || '2018-10-01', DATE_FORMAT);
      },
    },
    'anolysis/internals/gid-manager': {
      default: class GIDManager {
        init() {
          return Promise.resolve();
        }
        getNewInstallDate() { return '2000-01-01'; }
        getGID() {
          return Promise.resolve('gid');
        }
      },
    },
    'anolysis/internals/signals-queue': {
      default: class SignalQueue {
        init() { return Promise.resolve(); }
      },
    },
    'anolysis/internals/logger': {
      default: {
        // debug(...args) { console.log('DEBUG', ...args); },
        // log(...args) { console.log('LOG', ...args); },
        // error(...args) { console.log('ERROR', ...args); },
        debug() { },
        log() { },
        error() { },
      },
    },
    ...(mock || {}),
  }),
  () => {
    let anolysis;
    let availableDefinitions;

    beforeEach(async function () {
      const config = new Map();
      const Anolysis = (await this.system.import('anolysis/internals/anolysis')).default;
      config.set('Storage', (await this.system.import('anolysis/internals/storage/dexie')).default);
      anolysis = new Anolysis(config);

      await anolysis.registerSignalDefinitions(this.module().default);
      await anolysis.init();
      availableDefinitions = anolysis.availableDefinitions;

      onlyKeepAnalysisWithName(availableDefinitions, name, metrics);

      // Optionally mock retention state before each test
      if (retentionState) {
        anolysis.storage.retention.getState = () => Promise.resolve(retentionState);
      }
    });

    // Make sure we destroy Dexie storage after each test
    afterEach(() => anolysis.storage.destroy());

    describe(name, () => {
      if (metrics) {
        it('random metrics', async () => {
          const definition = availableDefinitions.get(name);
          if (definition.sendToBackend) {
            chai.expect(definition.version).to.be.a('number');
          }
          chai.expect(await generateAnalysisResults({
            name,
            availableDefinitions,
            anolysis,
            metrics,
            currentDate: currentDate || '2018-10-01',
          })).to.not.be.empty;
        });
      }

      if (tests) {
        tests(customMetrics => generateAnalysisResults({
          name,
          metrics: customMetrics || [],
          availableDefinitions,
          anolysis,
          currentDate: currentDate || '2018-10-01',
        }));
      }
    });
  },
);
