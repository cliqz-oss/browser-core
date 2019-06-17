/* global chai */
/* global describeModule */

/**
 * This modules exports a helper function used to test individual analyses. The
 * function takes as argument an object with three attributes (the last one,
 * `tests`, is optional).
 * - `name`: name of the analysis which is being tested.
 * - `metrics`: list of metrics which the analysis depends on.
 * - `tests`: function which takes one argument (generateAnalysisResults) and
 *   can define arbitrary tests.
 * - `currentDate`: mock when a different config_ts date is desired for this
 *   test.
 * - `retentionState`: allows to inject a different retention state (only used
 *   for retention analyses tests currently)
 *
 * Please read anolysis/README.md for more information. You can also have a look
 * into `anolysis/tests/unit/analyses` for examples.
 */

const UAParser = require('ua-parser-js');
const ajv = require('ajv');
const faker = require('json-schema-faker');
const moment = require('moment');
const mockDexie = require('../../core/unit/utils/dexie');

const DATE_FORMAT = 'YYYY-MM-DD';
const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';

/**
 * Given a valid JSON schema, generate `n` random examples from it.
 */
function generateSamples(schema, n) {
  const samples = [];
  for (let i = 0; i < n; i += 1) {
    samples.push(faker(schema));
  }
  return samples;
}

function onlyKeepAnalysisWithName(availableDefinitions, name, metrics = []) {
  // Only keep analysis `name` (the one we want to tests) and metrics it depends
  // upon in the `availableDefinitions` Map. This makes sure we only start
  // generation of signal for the analysis we intend to test.
  [...availableDefinitions.entries()].forEach(([schemaName, schema]) => {
    if (
      schema.generate !== undefined
      && schemaName !== name
      && metrics.indexOf(schemaName) === -1
    ) {
      availableDefinitions.delete(schemaName);
    }
  });
}


// Used to intercept all messages which would go to backend
let httpPostMessages;


async function generateAnalysisResults({
  name,
  availableDefinitions,
  anolysis,
  currentDate,
  metrics,
}) {
  const schema = availableDefinitions.get(name);
  let numberOfSignals = 0;

  // Intercept metrics of type `name`. This is mainly used to tests metrics
  // which are emitting signals using a `generate` function (e.g.: abtests).
  // These are not sent to backend, but can still be unit-tested.
  const metricsSignals = [];
  const addBehavior = anolysis.storage.behavior.add.bind(anolysis.storage.behavior);
  // eslint-disable-next-line no-param-reassign
  anolysis.storage.behavior.add = (metric) => {
    if (metric.type === name) {
      numberOfSignals += 1;
      metricsSignals.push(JSON.stringify(metric));
    }
    return addBehavior(metric);
  };

  // We intercept messages going through `push` to know how many we expect to
  // received from backend-communication and wait accordingly.
  const signalQueuePush = anolysis.signalQueue.push.bind(anolysis.signalQueue);

  // eslint-disable-next-line no-param-reassign
  anolysis.signalQueue.push = async (signal, ...args) => {
    // Only push the signals we are interested in
    if (signal.type === name) {
      numberOfSignals += 1;
      await signalQueuePush(signal, ...args);
    }
  };

  // If the given analysis expects to receive an aggregation of signal as
  // argument (function `generate` has length > 0), then we generate fake
  // random signals from the schema, which specifies the shape of signals to
  // be aggregated for this analysis.
  if (schema.generate !== undefined
    && schema.generate.length > 0
  ) {
    const metricsToPush = [];
    if (metrics.forEach !== undefined) {
      // If this is an array, it means we got a list of metrics' names. Then
      // we randomly generate signals from their schemas.
      metrics.forEach((metricSchema) => {
        metricsToPush.push(...generateSamples(
          availableDefinitions.get(metricSchema).schema,
          10, // number of random metrics to generate
        ).map(s => ({ s, metric: metricSchema })));
      });
    } else {
      // Otherwise we expect an object which keys are names of metrics, and
      // values are arrays of signals from these metrics. They are used as is.
      Object.keys(metrics).forEach((metric) => {
        metricsToPush.push(...metrics[metric].map(
          s => ({ s, metric })
        ));
      });
    }

    for (let i = 0; i < metricsToPush.length; i += 1) {
      const { s, metric } = metricsToPush[i];
      // eslint-disable-next-line no-await-in-loop
      await anolysis.handleTelemetrySignal(s, metric);
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  // We push all random signals to Anolysis (using `handleTelemetrySignal`).
  // Since their schema specifies that they are `sendToBackend = false`, they will
  // be stored for later aggregation.
  //
  // We then force the aggregation of the daily signals, and expect the message
  // queue to receive at least one signal.
  await anolysis.updateRetentionState();
  await anolysis.runTasksForDay(currentDate, 0);
  await anolysis.runTasksForDay(currentDate, 1);

  if (numberOfSignals === 0) {
    return [];
  }

  const collectUrl = `${anolysis.config.get('backend.url')}/collect`;
  const getGeneratedSignals = () => [
    ...metricsSignals,
    ...(httpPostMessages.get(collectUrl) || []),
  ];

  // Wait for all messages to be received
  while (getGeneratedSignals().length !== numberOfSignals) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  const signals = getGeneratedSignals().map(JSON.parse);
  signals.forEach((signal) => {
    // Check metadata creation
    if (schema.sendToBackend) {
      chai.expect(signal.meta.version).to.be.eql(schema.version);

      chai.expect(signal.meta.dev).to.be.true;
      chai.expect(signal.meta.date).to.be.eql(currentDate);
      chai.expect(signal.meta.session).to.be.eql('session');

      if (schema.needsGid) {
        chai.expect(signal.meta.gid).to.be.eql('gid');
      } else {
        chai.expect(signal.meta.gid).to.be.eql('');
      }
    }
  });

  return signals.map(({ behavior }) => behavior);
}

module.exports = ({ name, metrics, currentDate, mock, tests, retentionState }) => describeModule('anolysis/telemetry-schemas',
  () => ({
    ...mockDexie,
    'core/http': {
      httpPost: async (url, callback, payload) => {
        // Keep track of `url`/`payload`
        if (!httpPostMessages.has(url)) {
          httpPostMessages.set(url, []);
        }
        httpPostMessages.get(url).push(payload);

        callback({ response: '{}' });
      },
    },
    'platform/network': {
      default: {
        type: 'wifi',
      },
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
    'core/platform': {},
    'core/services/pacemaker': {
      default: {
        clearTimeout(timeout) { clearTimeout(timeout); },
        sleep() { },
        setTimeout() { return { stop() {} }; },
        register(fn, { timeout }) { return setInterval(fn, timeout); },
      }
    },
    'core/kord/inject': {
      default: {
        module: () => ({
          isEnabled: () => true,
        }),
      },
    },
    'core/prefs': {
      default: {
        get: (k, d) => {
          if (k === 'developer') {
            return true;
          }
          if (k === 'session') {
            return 'session';
          }
          if (k === 'signalQueue.sendInterval') {
            // Speed-up signal queue by waiting only 100ms between each interval
            return 100;
          }
          if (k === 'signalQueue.batchSize') {
            return 100;
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
    'platform/sqlite': {
      openDBHome: () => {},
      close: () => {},
    },
    ...(mock || {}),
  }),
  () => {
    let anolysis;
    let availableDefinitions;

    beforeEach(async function () {
      const createConfig = (await this.system.import('anolysis/internals/config')).default;
      const config = await createConfig({ demographics: {}, Storage: (await this.system.import('anolysis/internals/storage/dexie')).default });
      const Anolysis = (await this.system.import('anolysis/internals/anolysis')).default;
      anolysis = new Anolysis(config);

      await anolysis.init();

      availableDefinitions = anolysis.availableDefinitions;
      onlyKeepAnalysisWithName(availableDefinitions, name, metrics);

      // Optionally mock retention state before each test
      if (retentionState) {
        anolysis.storage.retention.getState = () => Promise.resolve(retentionState);
      }

      // Reset list of signals received from httpPost
      httpPostMessages = new Map();
    });

    // Make sure we destroy Dexie storage after each test
    afterEach(async () => {
      await anolysis.reset();
      anolysis.unload();
    });

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
          })).to.not.throw;
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
  });
