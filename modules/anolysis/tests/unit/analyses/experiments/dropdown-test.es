/* global chai */

require('../../telemetry-schemas-test-helpers')({
  name: 'analyses.experiments.dropdown.fullHeight',
  metrics: [
    'metrics.core.abtests',
    'search.session',
  ],
  tests: (generateAnalysisResults) => {
    context('dropdown.fullHeight', function () {
      const test = async (metrics, check) => {
        const signals = await generateAnalysisResults(metrics);
        return check(signals);
      };

      it('extracts group from target AB test', () =>
        test({
          'metrics.core.abtests': [
            [
              {
                groups: {
                  A: {
                    'experiments.dropdown.fullHeight': false,
                  },
                  B: {
                    'experiments.dropdown.fullHeight': true,
                  },
                },
                group: 'B',
              },
            ],
          ],
        },
        signals => chai.expect(signals[0].group).to.eql('B')));

      it('ignores legacy AB tests', () =>
        test({
          'metrics.core.abtests': [
            [
              { id: '42_a' },
            ]
          ],
        },
        signals => chai.expect(signals).to.be.empty));

      it('does not emit if there are no AB tests', () =>
        test({
          'metrics.core.abtests': [[]],
        },
        signals => chai.expect(signals).to.be.empty));

      it('does not emit for other AB tests', () =>
        test({
          'metrics.core.abtests': [
            [
              {
                groups: {
                  A: {
                    'some.pref': false,
                  },
                  B: {
                    'some.pref': true,
                  },
                },
                group: 'B',
              },
            ],
          ],
        },
        signals => chai.expect(signals).to.be.empty));
    });
  },
});
