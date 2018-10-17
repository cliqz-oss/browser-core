/* global chai */

let aristotleMocks = null;
let legacyMocks = null;

require('../telemetry-schemas-test-helpers')({
  name: 'metrics.core.abtests',
  mock: {
    'core/prefs': {
      default: {
        get(p, def) {
          if (p === 'ABTests') { return legacyMocks; }
          return def;
        },
        set() {},
        has() { return false; },
      },
    },
    'core/kord/inject': {
      default: {
        module() {
          return {
            isEnabled: () => true,
            async action(action) {
              if (action === 'getRunningTests') {
                return aristotleMocks;
              }
              return Promise.reject(`No such action: ${action}`);
            },
          };
        },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    [
      { abtests: JSON.stringify({}), result: [] },
      { abtests: undefined, result: [] },
      { abtests: null, result: [] },
      { abtests: 42, result: [] },
      { abtests: JSON.stringify({ '10_A': {} }), result: [{ id: 10, group: 'A' }] },
      { abtests: JSON.stringify({ '10_A': [] }), result: [{ id: 10, group: 'A' }] },
      { abtests: JSON.stringify({ '10_A': 42 }), result: [{ id: 10, group: 'A' }] },
      { abtests: JSON.stringify({ '10_A': {}, '11_B': {}, '12_C': {} }),
        result: [{ id: 10, group: 'A' }, { id: 11, group: 'B' }, { id: 12, group: 'C' }] },
    ].forEach(({ abtests, result }) => {
      it(`parses legacy ${abtests}`, async () => {
        aristotleMocks = { 42: { id: 42, group: 'A' } };
        legacyMocks = abtests;
        chai.expect(await generateAnalysisResults()).to.be.eql([
          [
            // Aristotle
            { id: 42, group: 'A' },
            // Legacy
            ...result,
          ],
        ]);
      });
    });

    [
      { abtests: {}, result: [] },
      { abtests: { 42: { id: 42, group: 'A' } }, result: [{ id: 42, group: 'A' }] },
      { abtests: { 42: { id: 42, group: 'A' }, 43: { id: 43, group: 'B' } },
        result: [{ id: 42, group: 'A' }, { id: 43, group: 'B' }] },
    ].forEach(({ abtests, result }) => {
      it(`parses Aristotle ${abtests}`, async () => {
        aristotleMocks = abtests;
        legacyMocks = JSON.stringify({ '10_A': {} });
        chai.expect(await generateAnalysisResults()).to.be.eql([
          [
            // Aristotle
            ...result,
            // Legacy
            { id: 10, group: 'A' },
          ],
        ]);
      });
    });
  },
});
