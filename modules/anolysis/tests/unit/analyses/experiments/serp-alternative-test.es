
/* global chai */
require('../../telemetry-schemas-test-helpers')({
  name: 'analyses.experiments.serp.alternative',
  metrics: [
    'metrics.experiments.serp.state',
    'metrics.experiments.serp.click.search',
  ],
  tests: (generateAnalysisResults) => {
    const test = async (metrics, check) => {
      const signals = await generateAnalysisResults(metrics);
      chai.expect(signals).to.have.length(1);
      return check(signals[0]);
    };

    context('state', function () {
      it('takes group and engine from last signal', () =>
        test({
          'metrics.experiments.serp.state': [
            { group: null, serpAlternativeSearchEngine: null },
            { group: 'A', serpAlternativeSearchEngine: 'duckduckgo' },
          ],
        },
        signal => chai.expect(signal).to.include({
          group: 'A',
          serpAlternativeSearchEngine: 'duckduckgo',
        })));
    });

    context('counts', function () {
      it('counts categories', () =>
        test({
          'metrics.experiments.serp.state': [{}],
          'metrics.experiments.serp.click.search': [
            { engine: 'cliqz', category: null },
            { engine: 'duckduckgo', category: 'web' },
            { engine: 'google', category: 'web' },
            { engine: 'duckduckgo', category: 'pictures' },
            { engine: 'duckduckgo', category: 'videos' },
            { engine: 'duckduckgo', category: 'maps' },
            { engine: 'duckduckgo', category: 'news' },
            { engine: 'duckduckgo', category: 'pictures' },
          ],
        },
        signal => chai.expect(signal.category).to.deep.eql({
          web: 2,
          pictures: 2,
          videos: 1,
          maps: 1,
          news: 1,
        })));
    });
  }
});
