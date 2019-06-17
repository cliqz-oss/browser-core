/* globals describeModule, chai */
const punycode = require('punycode');
const tldts = require('tldts');
require('../../telemetry-schemas-test-helpers')({
  name: 'analysis.performance.webrequest-pipeline.timings',
  metrics: [
    'metrics.performance.webrequest-pipeline.timings',
  ],
  tests: (generateAnalysisResults) => {
    it('generates nothing if no metric emitted', async () => {
      chai.expect(await generateAnalysisResults({})).to.have.length(0);
    });

    it('aggregates histograms', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.performance.webrequest-pipeline.timings': [
          [
            { step: 'step1', histogram: { 0: 1 } },
            { step: 'step1', histogram: { 1: 1 } },
          ], [
            { step: 'step1', histogram: { 0: 2, 1: 2, 2: 3 } },
            { step: 'step2', histogram: { 0: 1 } },
          ], [
            { step: 'step2', histogram: { 1: 1, '70+': 42 } },
          ], [
            { step: 'step2', histogram: { 0: 1, 1: 1, '70+': 42 } },
          ],
        ],
      })).to.be.eql([[
        { step: 'step1', histogram: { 0: 3, 1: 3, 2: 3 } },
        { step: 'step2', histogram: { 0: 2, 1: 2, '70+': 84 } },
      ]]);
    });
  },
});


let telemetrySignals = [];

describeModule('webrequest-pipeline/latency-metrics',
  () => ({
    'core/kord/inject': {
      default: {
        service() {
          return {
            push: (signal) => {
              telemetrySignals.push(signal);
            },
            isEnabled: () => true,
          };
        },
      },
    },
    'core/helpers/timeout': {
      default: () => ({
        stop() {},
      }),
    },
    'platform/lib/tldts': tldts,
    'platform/lib/punycode': {
      default: punycode,
    },
  }),
  () => {
    let latency = null;

    beforeEach(function () {
      const Latency = this.module().default;
      latency = new Latency('test');
    });

    afterEach(() => {
      telemetrySignals = [];
    });

    describe('#addTiming', () => {
      [
        // Bins of 1ms
        '0', '1', '2', '3', '4',

        // Bins of 5ms
        '5-9',
        '10-14',
        '15-19',
        '20-24',
        '25-29',

        // Bins of 10ms
        '30-39',
        '40-49',
        '50-59',
        '60-69',
      ].forEach((bin) => {
        it(`update histogram for bin ${bin}`, async () => {
          const bounds = bin.split('-').map(b => parseInt(b, 10));
          const start = bounds[0];
          const end = bounds[bounds.length - 1];
          for (let i = start; i <= end; i += 1) {
            latency.addTiming('step', i);
          }

          await latency.flush();
          chai.expect(telemetrySignals).to.have.length(1); // 1 metric
          chai.expect(telemetrySignals[0]).to.have.length(1); // 1 histogram
          chai.expect(telemetrySignals[0][0].step).to.be.eql('test.step');
          chai.expect(telemetrySignals[0][0].histogram).to.be.eql({
            [bin]: (end - start) + 1,
          });
        });
      });

      it('stores everything >= 70 in 70+ bucket', async () => {
        for (let i = 70; i < 4070; i += 1) {
          latency.addTiming('step', i);
        }

        await latency.flush();
        chai.expect(telemetrySignals).to.have.length(1); // 1 metric
        chai.expect(telemetrySignals[0]).to.have.length(1); // 1 histogram
        chai.expect(telemetrySignals[0][0].step).to.be.eql('test.step');
        chai.expect(telemetrySignals[0][0].histogram).to.be.eql({
          '70+': 4000,
        });
      });
    });
  });
