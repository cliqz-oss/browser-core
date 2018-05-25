/* global chai */
/* global sinon */
/* global describeModule */

/**
 * This array contains a list of analyses that will be tested automatically. You
 * need to provide the name of your analysis, as well as a list of metrics that
 * your analysis depends on. The tests consists in the following:
 *
 * 1. Generate random instances of all the specified metrics
 * 2. Simulate sending of metrics to Anolysis
 * 3. Trigger aggregation (the same way it happens in the extension on a new day)
 * 4. Intercept all signals which would be sent to backend
 * 5. Make sure that your analysis generated at least one signals (which
 * respects the specified JSON Schema).
 *
 * For more specific tests, you can add your own test cases at the bottom of
 * this file (see existing tests for examples).
 */
const analysesToTest = [
  // Cliqz Tab
  {
    name: 'freshtab-settings',
    metrics: [
      'freshtab.prefs.blueTheme',
      'freshtab.prefs.config',
    ]
  },
  {
    name: 'freshtab-state',
    metrics: ['freshtab.prefs.state'],
  },

  // Retention
  { name: 'retention-daily', metrics: [] },
  { name: 'retention-monthly', metrics: [] },
  { name: 'retention-weekly', metrics: [] },

  // News
  {
    name: 'news-snippets',
    metrics: [
      'freshtab.home.click.breakingnews',
      'freshtab.home.click.topnews',
      'freshtab.home.click.yournews',
      'freshtab.home.hover.breakingnews',
      'freshtab.home.hover.topnews',
      'freshtab.home.hover.yournews',
    ],
  },
  {
    name: 'news-pagination',
    metrics: [
      'freshtab.home.click.news_pagination',
    ],
  },
];

const mockDexie = require('../../core/unit/utils/dexie');
const UAParser = require('ua-parser-js');
const ajv = require('ajv');
const faker = require('json-schema-faker');
const moment = require('moment');
const stats = require('simple-statistics');

const CURRENT_DATE = '2018-10-01';
const DATE_FORMAT = 'YYYY-MM-DD';

const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';

let anolysis;
let availableDefinitions;

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

// From: https://stackoverflow.com/a/43053803
const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

/**
 *
 */
function testAnalysis(name, metrics = []) {
  const schema = availableDefinitions.get(name);

  // We expect the analysis to generate at least one signal. If valid (the
  // schema has been successfully validated), the signal(s) should be pushed
  // into the signal queue. We make sure that happens.
  const telemetrySignals = [];
  anolysis.signalQueue.push = sinon.spy((s) => {
    if (s.type === name) {
      // Check metadata creation
      chai.expect(s.meta.version).to.be.eql(schema.version);
      chai.expect(s.meta.dev).to.be.true;
      chai.expect(s.meta.date).to.be.eql(CURRENT_DATE);

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
  // argument (function `generate` has length > 0), then we generate fake random
  // signals from the `_source_schema`, which specifies the shape of signals to
  // be aggregated for this analysis.
  const numberOfSignals = 1;
  if (schema.generate !== undefined &&
      schema.generate.length > 0
  ) {
    if (schema._source_schema !== undefined) {
      pushedSignalsPromises.push(...generateSamples(
        schema._source_schema,
        numberOfSignals,
      ).map(s => anolysis.handleTelemetrySignal(s, name)));
    }

    if (metrics.forEach !== undefined) {
      // If this is an array, it means we got a list of metrics' names. Then we
      // randomly generate signals from their schemas.
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
  return Promise.all(pushedSignalsPromises)
    .then(() => {
      // Only generate retention signals if we are actually testing one of them.
      if (name.startsWith('retention-')) {
        return anolysis.sendRetentionSignals();
      }
      return Promise.resolve();
    })
    .then(() => anolysis.generateAndSendAnalysesSignalsForDay(CURRENT_DATE))
    .then(() => telemetrySignals);
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
          if (MOCK_PREFS.has(k)) {
            return MOCK_PREFS.get(k);
          } else if (k === 'ABTests') {
            return '{}';
          } else if (k === 'developer') {
            return true;
          }
          return d;
        },
        set() {},
        has() {},
        clear() {},
      },
    },
    'core/database': {
      default: class Database { destroy() { return Promise.resolve(); } },
    },
    'anolysis/internals/synchronized-date': {
      DATE_FORMAT,
      DAY_FORMAT,
      WEEK_FORMAT,
      MONTH_FORMAT,
      default() {
        return getCurrentDate();
      },
    },
    'anolysis/internals/gid-manager': {
      default: class GIDManager {
        init() {
          return Promise.resolve();
        }
        updateState() {
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
        debug() { /* console.log('DEBUG', ...args); */ },
        log() { /* console.log('LOG', ...args); */ },
        error(...args) { console.log('ERROR', ...args); },
      },
    },
  }),
  () => {
    beforeEach(function () {
      availableDefinitions = this.module().default;
      return Promise.all([
        this.system.import('anolysis/internals/anolysis'),
        this.system.import('anolysis/internals/storage/dexie'),
      ]).then(([anolysisModule, storage]) => {
        const Anolysis = anolysisModule.default;
        const config = new Map();
        config.set('Storage', storage.default);
        anolysis = new Anolysis(config);
        MOCK_PREFS = new Map();
      }).then(() => anolysis.registerSignalDefinitions(this.module().default))
        .then(() => anolysis.init())
        .then(() => { availableDefinitions = anolysis.availableDefinitions; });
    });

    afterEach(() => anolysis.storage.destroy());

    describe('Test analyses with random signals', () => {
      analysesToTest.forEach(({ name, metrics }) => {
        it(name, () => {
          // Only keep analysis `name` (the one we want to tests) and metrics it
          // depends on in the `availableDefinitions` Map. This makes sure we only
          // start generation of signal for the analysis we intend to test.
          [...availableDefinitions.entries()].forEach(([schemaName, schema]) => {
            if (schema.generate !== undefined && schemaName !== name) {
              availableDefinitions.delete(schemaName);
            }
          });

          // Check that a version is specified for the analysis.
          chai.expect(availableDefinitions.get(name).version).to.be.a('number');

          return testAnalysis(name, metrics)
            .then(signals => chai.expect(signals).to.not.be.empty);
        });
      });
    });

    describe('news-snippets', () => {
      const name = 'news-snippets';
      const test = (actions, check) => {
        const metrics = {};
        actions.forEach(({ edition, target, action, element, index }) => {
          const metricName = `freshtab.home.${action}.${target}`;
          if (metrics[metricName] === undefined) {
            metrics[metricName] = [];
          }
          metrics[metricName].push({
            type: 'home',
            edition,
            action,
            target,
            index,
            element: element || '',
          });
        });
        return testAnalysis(name, metrics).then(check);
      };

      it('handles no interaction', () =>
        test([], signals => chai.expect(signals).to.be.empty)
      );

      // Generate tests for all targets/actions/editions
      cartesian([
        'de',
        'de-tr-en',
        'es',
        'fr',
        'gb',
        'intl',
        'it',
        'pl',
        'us',
      ],
      ['click', 'hover'], // action
      ['topnews', 'breakingnews', 'yournews'], // target
      ).forEach(([edition, action, target]) => {
        it(`handles ${action} on ${target} with edition ${edition}`, () =>
          test([
            { edition, target, action, index: 0 },
            { edition, target, action, index: 1 },
            { edition, target, action, index: 2 },
          ], (signals) => {
            chai.expect(signals).to.have.length(1);
            chai.expect(signals[0]).to.be.eql({
              edition,
              action,
              target,
              histogram: [1, 1, 1],
            });
          })
        );
      });
    });

    describe('news-pagination', () => {
      const name = 'news-pagination';
      const test = (indices, check) => testAnalysis(name, {
        'freshtab.home.click.news_pagination': indices.map(index => ({ index })),
      }).then((signals) => {
        chai.expect(signals).to.have.length(1);
        return check(signals[0]);
      });

      it('has empty histogram with no pagination interaction', () =>
        testAnalysis(name).then(signals => chai.expect(signals).to.have.length(0))
      );

      it('computes histogram with one entry', () =>
        test([0, 0], signal => chai.expect(signal).to.be.eql({ clicks: [2] }))
      );

      it('computes histogram with sparse entries', () =>
        test([0, 0, 2], signal => chai.expect(signal).to.be.eql({ clicks: [2, 0, 1] }))
      );
    });

    describe('freshtab-state', () => {
      const name = 'freshtab-state';
      const test = (value, check) => testAnalysis(name, {
        'freshtab.prefs.state': [{ active: value }],
      }).then((signals) => {
        chai.expect(signals).to.have.length(1);
        return check(signals[0]);
      });

      it('enabled', () =>
        test(true, signal => chai.expect(signal).to.be.eql({ is_freshtab_on: true }))
      );

      it('disabled', () =>
        test(true, signal => chai.expect(signal).to.be.eql({ is_freshtab_on: true }))
      );
    });

    describe('freshtab-settings', () => {
      const name = 'freshtab-settings';
      const test = (theme, config, check) => testAnalysis(name, {
        'freshtab.prefs.config': [config],
        'freshtab.prefs.blueTheme': [{ enabled: theme }],
      }).then((signals) => {
        chai.expect(signals).to.have.length(1);
        return check(signals[0]);
      });

      it('gets right defaults', () => test(true, {}, s => chai.expect(s).to.be.eql({
        is_theme_on: true,
        is_background_on: true,
        is_most_visited_on: false,
        is_favorites_on: false,
        is_search_on: false,
        is_news_on: false,
      })));

      describe('reports theme state from pref', () => {
        it('enabled', () => test(true, {}, s => chai.expect(s.is_theme_on).to.be.true));
        it('disabled', () => test(false, {}, s => chai.expect(s.is_theme_on).to.be.false));
      });

      describe('reports background state from pref', () => {
        it('no background', () => test(true,
          { background: { image: 'bg-default' } },
          s => chai.expect(s.is_background_on).to.be.false),
        );

        it('background on', () => test(true,
          { background: { image: 'some_img' } },
          s => chai.expect(s.is_background_on).to.be.true),
        );
      });

      describe('reports most visited state from pref', () => {
        it('no most visited', () => test(true,
          { historyDials: { visible: false } },
          s => chai.expect(s.is_most_visited_on).to.be.false),
        );

        it('most visited on', () => test(true,
          { historyDials: { visible: true } },
          s => chai.expect(s.is_most_visited_on).to.be.true),
        );
      });

      describe('reports favorites state from pref', () => {
        it('no favorites', () => test(true,
          { customDials: { visible: false } },
          s => chai.expect(s.is_favorites_on).to.be.false),
        );

        it('favorites on', () => test(true,
          { customDials: { visible: true } },
          s => chai.expect(s.is_favorites_on).to.be.true),
        );
      });

      describe('reports search state from pref', () => {
        it('no search', () => test(true,
          { search: { visible: false } },
          s => chai.expect(s.is_search_on).to.be.false),
        );

        it('search on', () => test(true,
          { search: { visible: true } },
          s => chai.expect(s.is_search_on).to.be.true),
        );
      });

      describe('reports news state from pref', () => {
        it('no news', () => test(true,
          { news: { visible: false } },
          s => chai.expect(s.is_news_on).to.be.false),
        );

        it('news on', () => test(true,
          { news: { visible: true } },
          s => chai.expect(s.is_news_on).to.be.true),
        );
      });
    });

    describe('experiments', () => {
      context('serp', function () {
        const name = 'analyses.experiments.serp';
        const test = (metrics, check) => testAnalysis(
          name,
          metrics,
        ).then((signals) => {
          chai.expect(signals).to.have.length(1);
          return check(signals[0]);
        });

        beforeEach(() => onlyKeepAnalysisWithName(name));

        context('serp', function () {
          context('state', function () {
             it('takes group from last signal', () =>
               test({
                  'metrics.experiments.serp.state': [
                    { group: null },
                    { group: 'A' },
                  ],
                },
                signal => chai.expect(signal.group).to.eql('A'))
             );

             it('takes default from last signal', () =>
               test({
                  'metrics.experiments.serp.state': [
                    { isCliqzDefaultEngine: false },
                    { isCliqzDefaultEngine: true },
                  ],
                },
                signal => chai.expect(signal.isCliqzDefaultEngine).to.be.true)
             );
          });
          context('dropdownSelections', function () {
            it('counts cliqz selections', () =>
              test({
                  'metrics.experiments.serp.state': [{}],
                  'search.session': [
                    { hasUserInput: true, selection: { origin: 'cliqz', isSearchEngine: false } },
                    { hasUserInput: true, selection: { origin: 'other', isSearchEngine: false } },
                    { hasUserInput: true, selection: { origin: 'cliqz', isSearchEngine: false  } },
                    { hasUserInput: true, selection: { origin: 'cliqz', isSearchEngine: true } },
                  ],
                },
                signal => chai.expect(signal.dropdownSelections.cliqz)
                  .to.deep.eql({
                    total: 3,
                    isSearchEngine: 1,
                  })
              )
            );

            it('counts direct selections', () =>
              test({
                  'metrics.experiments.serp.state': [{}],
                  'search.session': [
                    { hasUserInput: true, selection: { origin: 'direct', isSearchEngine: true } },
                    { hasUserInput: true, selection: { origin: 'other', isSearchEngine: false } },
                    { hasUserInput: true, selection: { origin: 'direct', isSearchEngine: false } },
                    { hasUserInput: true, selection: { origin: 'direct', isSearchEngine: false } },
                  ],
                },
                signal => chai.expect(signal.dropdownSelections.direct)
                  .to.deep.eql({
                    total: 3,
                    isSearchEngine: 1,
                  })
              )
            );

            it('counts other selections', () =>
               test({
                  'metrics.experiments.serp.state': [{}],
                  'search.session': [
                    { hasUserInput: true, selection: { origin: 'other' } },
                    { hasUserInput: true, selection: { origin: 'other' } },
                    { hasUserInput: true, selection: { origin: 'cliqz' } },
                  ],
                },
                signal => chai.expect(signal.dropdownSelections.other).to.eql(2))
            );

            it('counts abandoned selections', () =>
               test({
                  'metrics.experiments.serp.state': [{}],
                  'search.session': [
                    { hasUserInput: true, selection: { origin: null } },
                    { hasUserInput: true, selection: { origin: 'other' } },
                    { hasUserInput: true, selection: { origin: null } },
                  ],
                },
                signal => chai.expect(signal.dropdownSelections.abandoned).to.eql(2))
            );
          });

          context('serpSelections', function () {
            it('counts results', () =>
               test({
                  'metrics.experiments.serp.state': [{}],
                  'metrics.experiments.serp.click.result': [
                    { source: 'm' },
                    { source: 'Z' },
                    { source: 'm' },
                  ],
                },
                signal => chai.expect(signal.serpSelections.result).to.eql(2))
            );

            it('counts suggestions', () =>
               test({
                  'metrics.experiments.serp.state': [{}],
                  'metrics.experiments.serp.click.result': [
                    { source: 'Z' },
                    { source: 'm' },
                    { source: 'Z' },
                    { source: 'Z' },
                  ],
                },
                signal => chai.expect(signal.serpSelections.suggestion).to.eql(3))
            );

            it('counts other', () =>
               test({
                  'metrics.experiments.serp.state': [{}],
                  'metrics.experiments.serp.click.search': [{}, {}],
                },
                signal => chai.expect(signal.serpSelections.other).to.eql(2))
            );

            it('counts abandoned', () =>
               test({
                  'metrics.experiments.serp.state': [{}],
                  'metrics.experiments.serp.show': [{}, {}, {}, {}, {}],
                  'metrics.experiments.serp.click.result': [
                    { source: 'Z' },
                    { source: 'm' },
                  ],
                  'metrics.experiments.serp.click.search': [{}, {}],
                },
                signal => chai.expect(signal.serpSelections.abandoned).to.eql(1))
            );
          });
        });
      });
    });
  },
);
