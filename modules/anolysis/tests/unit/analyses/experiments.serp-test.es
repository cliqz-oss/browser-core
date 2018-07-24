/* global chai */

require('../telemetry-schemas-test-helpers')({
  name: 'analyses.experiments.serp',
  metrics: [
    'metrics.experiments.serp.state',
    'metrics.experiments.serp.click.result',
    'metrics.experiments.serp.click.search',
    'metrics.experiments.serp.show',
  ],
  tests: (generateAnalysisResults) => {
    context('serp', function () {
      const test = async (metrics, check) => {
        const signals = await generateAnalysisResults(metrics);
        chai.expect(signals).to.have.length(1);
        return check(signals[0]);
      };

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
                { hasUserInput: true, selection: { origin: 'cliqz', isSearchEngine: false } },
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
  },
});
