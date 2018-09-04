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
      { abtests: JSON.stringify({ AB1: {} }), result: [{ id: 'AB1' }] },
      { abtests: JSON.stringify({ AB1: [] }), result: [{ id: 'AB1' }] },
      { abtests: JSON.stringify({ AB1: 42 }), result: [{ id: 'AB1' }] },
      { abtests: JSON.stringify({ AB1: {}, AB2: {}, AB3: {} }), result: [{ id: 'AB1' }, { id: 'AB2' }, { id: 'AB3' }] },
    ].forEach(({ abtests, result }) => {
      it(`parses legacy ${abtests}`, async () => {
        aristotleMocks = { 42: { id: 42 } };
        legacyMocks = abtests;
        chai.expect(await generateAnalysisResults()).to.be.eql([
          [
            // Aristotle
            { id: 42 },
            // Legacy
            ...result,
          ],
        ]);
      });
    });

    [
      { abtests: {}, result: [] },
      { abtests: { 42: { id: 42 } }, result: [{ id: 42 }] },
      { abtests: { 42: { id: 42 }, 43: { id: 43 } }, result: [{ id: 42 }, { id: 43 }] },
    ].forEach(({ abtests, result }) => {
      it(`parses Aristotle ${abtests}`, async () => {
        aristotleMocks = abtests;
        legacyMocks = JSON.stringify({ AB1: {} });
        chai.expect(await generateAnalysisResults()).to.be.eql([
          [
            // Aristotle
            ...result,
            // Legacy
            { id: 'AB1' },
          ],
        ]);
      });
    });
  },
});
