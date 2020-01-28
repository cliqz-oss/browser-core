/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
 *
 * Please read anolysis/README.md for more information. You can also have a look
 * into `anolysis/tests/unit/analyses` for examples.
 */

const faker = require('json-schema-faker');

const mockDexie = require('../../core/unit/utils/dexie');

const mockAnolysis = require('./mocks');

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

function onlyKeepAnalysisWithName(availableDefinitions, analysis, metrics = []) {
  const definitions = new Map();

  // Only keep analysis `name` (the one we want to tests) and metrics it depends
  // upon in the `availableDefinitions` Map. This makes sure we only start
  // generation of signal for the analysis we intend to test.
  for (const [name, schema] of availableDefinitions) {
    if (analysis === name || metrics.indexOf(name) !== -1) {
      definitions.set(name, schema);
    }
  }

  return definitions;
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
  anolysis.storage.behavior.add = (date, type, behavior) => {
    const metric = { type, behavior };
    if (type === name) {
      numberOfSignals += 1;
      metricsSignals.push(metric);
    }
    return addBehavior(date, type, behavior);
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
        if (availableDefinitions.has(metricSchema)) {
          metricsToPush.push(...generateSamples(
            availableDefinitions.get(metricSchema).schema,
            10, // number of random metrics to generate
          ).map(s => ({ s, metric: metricSchema })));
        }
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
  await anolysis.runTasksForDay(currentDate, 0);
  await anolysis.runTasksForDay(currentDate, 1);

  if (numberOfSignals === 0) {
    return [];
  }

  const collectUrl = `${anolysis.config.backend.url}/collect`;
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

  return getGeneratedSignals().map((signal) => {
    // Check metadata creation
    if (schema.sendToBackend !== undefined) {
      chai.expect(signal.meta.dev, 'dev').to.be.false;
      chai.expect(signal.meta.beta, 'beta').to.be.false;

      chai
        .expect(signal.meta.version, 'version')
        .to.be.eql(schema.sendToBackend.version);

      chai
        .expect(signal.meta.date, 'date')
        .to.be.eql(currentDate.toString());

      if (schema.sendToBackend.demographics) {
        chai
          .expect(signal.meta.demographics, 'demographics')
          .to.have.all.keys(schema.sendToBackend.demographics);
      }
    }

    return signal.behavior;
  });
}

async function fakeHttpPost(url, payload) {
  // Keep track of `url`/`payload`
  if (!httpPostMessages.has(url)) {
    httpPostMessages.set(url, []);
  }
  httpPostMessages.get(url).push(payload);


  return { response: '{}' };
}

function runTestsWithStorage(getStorage, {
  name,
  metrics = [],
  schemas,
  tests,
}) {
  let anolysis;
  let availableDefinitions;

  describe(name, () => {
    beforeEach(async function () {
      const SafeDate = (await this.system.import('anolysis/internals/date')).default;
      const Anolysis = (await this.system.import('anolysis/internals/anolysis')).default;

      anolysis = new Anolysis(SafeDate.fromBackend('2018-10-01'), {
        backend: {
          url: '',
          post: fakeHttpPost,
        },
        queue: {
          batchSize: 1000,
          sendInterval: 100,
          maxAttempts: 1,
        },
        signals: {
          meta: {
            demographics: {
              campaign: 'the/campaign',
              country: 'the/country',
              install_date: 'the/install_date',
              platform: 'the/platform',
              product: 'the/product',
            },
            dev: false,
            beta: false,
          },
        },
        storage: getStorage(),
      });

      await anolysis.init();

      await Promise.all(schemas.map(async (schemaPath) => {
        const exportedSchemas = (await this.system.import(schemaPath)).default;
        if (Array.isArray(exportedSchemas) === false) {
          anolysis.register(exportedSchemas);
        } else {
          for (const schema of exportedSchemas) {
            anolysis.register(schema);
          }
        }
      }));

      const analysisSchema = anolysis.availableDefinitions.get(name);
      metrics.push(...(analysisSchema.metrics || []));

      anolysis.availableDefinitions = onlyKeepAnalysisWithName(
        anolysis.availableDefinitions,
        name,
        metrics,
      );
      availableDefinitions = anolysis.availableDefinitions;

      // Reset list of signals received from httpPost
      httpPostMessages = new Map();
    });

    // Make sure we destroy Dexie storage after each test
    afterEach(async () => {
      await anolysis.reset();
      anolysis.unload();
    });

    it('random metrics', async () => {
      if (metrics && metrics.length !== 0) {
        const definition = availableDefinitions.get(name);
        if (definition.sendToBackend) {
          chai.expect(definition.sendToBackend.version).to.be.a('number');
        }
        chai.expect(await generateAnalysisResults({
          name,
          availableDefinitions,
          anolysis,
          metrics,
          currentDate: anolysis.currentDate,
        })).to.not.throw;
      }
    });

    if (tests) {
      tests(customMetrics => generateAnalysisResults({
        name,
        metrics: customMetrics || [],
        availableDefinitions,
        anolysis,
        currentDate: anolysis.currentDate,
      }));
    }
  });
}

module.exports = ({ name, schemas, metrics, mock, tests }) => describeModule('anolysis/internals/anolysis',
  () => ({
    ...mockAnolysis,
    'platform/globals': {},
    'core/kord/inject': {
      default: {
        module: () => ({
          isEnabled: () => true,
        }),
      },
    },
    'core/services/pacemaker': {
      default: {
        clearTimeout(timeout) { clearTimeout(timeout); },
        sleep() { },
        setTimeout() { return { stop() {} }; },
        register(fn, { timeout }) { return setInterval(fn, timeout); },
        nextIdle() {},
      },
    },
    'anolysis/internals/logger': {
      default: {
        // debug(...args) { console.log('DEBUG', ...args); },
        // log(...args) { console.log('LOG', ...args); },
        // error(...args) { console.log('ERROR', ...args); },
        debug() {},
        log() {},
        error() {},
      },
    },
    ...(mock || {}),
  }),
  () => {
    describe('dexie', () => {
      let Dexie;
      let Storage;

      beforeEach(async function () {
        if (Dexie === undefined) {
          Dexie = await mockDexie['platform/lib/dexie'].default();
        }

        if (Storage === undefined) {
          Storage = (await this.system.import('anolysis/internals/storage/dexie')).default;
        }
      });

      runTestsWithStorage(() => new Storage(Dexie), {
        name,
        metrics,
        schemas,
        tests,
      });
    });

    describe('async-storage', () => {
      let Storage;
      let AsyncStorage;

      beforeEach(async function () {
        if (AsyncStorage === undefined) {
          AsyncStorage = (await this.system.import('core/helpers/memory-async-storage')).default;
        }

        if (Storage === undefined) {
          Storage = (await this.system.import('anolysis/internals/storage/async-storage')).default;
        }
      });

      runTestsWithStorage(() => new Storage(AsyncStorage), {
        name,
        metrics,
        schemas,
        tests,
      });
    });
  });
