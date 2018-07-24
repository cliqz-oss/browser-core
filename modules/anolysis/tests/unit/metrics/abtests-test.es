/* global chai */

let abtestMock = null;

require('../telemetry-schemas-test-helpers')({
  name: 'metrics.core.abtests',
  mock: {
    'core/prefs': {
      default: {
        get(p, def) {
          if (p === 'ABTests') { return abtestMock; }
          if (p === 'abtests_running') { return abtestMock; }
          return def;
        },
        set() {},
        has() { return false; },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    [
      { abtests: JSON.stringify({}), result: [] },
      { abtests: undefined, result: [] },
      { abtests: null, result: [] },
      { abtests: 42, result: [] },
      { abtests: JSON.stringify({ AB1: {} }), result: ['AB1'] },
      { abtests: JSON.stringify({ AB1: [] }), result: ['AB1'] },
      { abtests: JSON.stringify({ AB1: 42 }), result: ['AB1'] },
      { abtests: JSON.stringify({ AB1: {}, AB2: {}, AB3: {} }), result: ['AB1', 'AB2', 'AB3'] },
    ].forEach(({ abtests, result }) => {
      it(`parses ${abtests}`, async () => {
        abtestMock = abtests;
        chai.expect(await generateAnalysisResults()).to.be.eql([
          [
            // First one if for Aristotle
            ...result,
            // Second one is for core/ab-tests
            ...result,
          ],
        ]);
      });
    });
  },
});
