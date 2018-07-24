/* global chai */

let freshTabEnabled = true;

require('../telemetry-schemas-test-helpers')({
  name: 'freshtab.prefs.state',
  metrics: [],
  mock: {
    'core/kord/inject': {
      default: {
        module() {
          return {
            async action(action) {
              if (!freshTabEnabled) {
                return Promise.reject('Freshtab is not enabled');
              }

              if (action === 'getState') {
                return { enabled: true };
              }

              return Promise.reject(`No such action: ${action}`);
            },
          };
        },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    beforeEach(() => {
      freshTabEnabled = true;
    });

    it('does not generate signals when freshtab is disabled', async () => {
      freshTabEnabled = false;
      chai.expect(await generateAnalysisResults()).to.be.empty;
    });
  },
});

require('../telemetry-schemas-test-helpers')({
  name: 'freshtab-state',
  metrics: ['freshtab.prefs.state'],
  tests: (generateAnalysisResults) => {
    const test = async (value, check) => {
      const signals = await generateAnalysisResults({
        'freshtab.prefs.state': [{ active: value }],
      });
      chai.expect(signals).to.have.length(1);
      check(signals[0]);
    };

    it('enabled', () =>
      test(true, signal => chai.expect(signal).to.be.eql({ is_freshtab_on: true }))
    );

    it('disabled', () =>
      test(true, signal => chai.expect(signal).to.be.eql({ is_freshtab_on: true }))
    );
  },
});
