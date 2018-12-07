/* global chai */

require('../telemetry-schemas-test-helpers')({
  name: 'analyses.favorites.migration.folders',
  metrics: [
    'metrics.favorites.migration.folders',
  ],
  tests: (generateAnalysisResults) => {
    const signal1 = {
      count: 10,
      rootFolderCount: 4,
      maxDepth: 6
    };
    const signal2 = {
      count: 5,
      rootFolderCount: 2,
      maxDepth: 4
    };
    const telemetry = {
      'metrics.favorites.migration.folders': [signal1, signal2]
    };

    it('generates 0 signals if no telemetry was sent', () =>
      generateAnalysisResults({}).then(signals => chai.expect(signals).to.have.length(0)));

    it('takes last signal', () =>
      generateAnalysisResults(telemetry).then(([first]) => chai.expect(first).to.eql(signal2)));

    it('shows correct folder count', () =>
      generateAnalysisResults(telemetry).then(([first]) => chai.expect(first.count).to.equal(5)));

    it('shows correct root folder count', () =>
      generateAnalysisResults(telemetry).then(([first]) =>
        chai.expect(first.rootFolderCount).to.equal(2)));

    it('shows correct max depth', () =>
      generateAnalysisResults(telemetry)
        .then(([first]) => chai.expect(first.maxDepth).to.equal(4)));
  },
});
