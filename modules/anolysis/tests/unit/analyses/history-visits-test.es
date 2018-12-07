/* global chai */

require('../telemetry-schemas-test-helpers')({
  name: 'analysis.history.visits.count',
  metrics: [
    'metrics.history.visits.count',
  ],
  tests: (generateAnalysisResults) => {
    const visits = [
      {
        visitsCount: 1,
      },
      {
        visitsCount: 2,
      },
      {
        visitsCount: 3,
      },
    ];

    it('generates 0 signals if no telemetry was sent', () =>
      generateAnalysisResults({}).then(signals => chai.expect(signals).to.have.length(0)));

    it('shows correct visits count', () =>
      generateAnalysisResults({
        'metrics.history.visits.count': visits
      }).then(([first]) => chai.expect(first.count).to.equal(6)));

    it('shows null if count > 300', () => {
      const moreVisits = visits.concat({
        visitsCount: 300,
      });

      return generateAnalysisResults({
        'metrics.history.visits.count': moreVisits
      }).then(([first]) => chai.expect(first.count).to.equal(null));
    });
  },
});
