/* global chai */

let freshtTabActionResult = Promise.resolve({ active: true });

require('../telemetry-schemas-test-helpers')({
  name: 'metrics.freshtab.state',
  metrics: [],
  mock: {
    'core/kord/inject': {
      default: {
        module() {
          return {
            isEnabled: () => true,
            async action(action) {
              if (action === 'getState') {
                return freshtTabActionResult;
              }

              return Promise.reject(new Error(`No such action: ${action}`));
            },
          };
        },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    const test = async (check) => {
      const signals = await generateAnalysisResults({});
      chai.expect(signals).to.have.length(1);
      check(signals[0]);
    };

    it('enabled', () => {
      freshtTabActionResult = Promise.resolve({ active: true });
      return test(signal => chai.expect(signal).to.be.eql({ is_freshtab_on: true }));
    });

    it('disabled', () => {
      freshtTabActionResult = Promise.resolve({ active: false });
      return test(signal => chai.expect(signal).to.be.eql({ is_freshtab_on: false }));
    });

    it('disabled (field missing)', () => {
      freshtTabActionResult = Promise.resolve({});
      return test(signal => chai.expect(signal).to.be.eql({ is_freshtab_on: false }));
    });

    it('freshtab not reachable', () => {
      freshtTabActionResult = Promise.reject();
      return test(signal => chai.expect(signal).to.be.eql({ is_freshtab_on: false }));
    });
  },
});
