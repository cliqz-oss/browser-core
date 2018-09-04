/* global chai */

require('../../telemetry-schemas-test-helpers')({
  name: 'analyses.experiments.serp',
  metrics: [
    'metrics.experiments.serp.state',
    'metrics.experiments.serp.click.result',
    'metrics.experiments.serp.click.search',
    'metrics.experiments.serp.enter.search',
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
        context('serpShows', function () {
          it('counts `landing` view impressions', () =>
            test({
              'metrics.experiments.serp.state': [{}],
              'metrics.experiments.serp.show': [
                { view: 'results' },
                { view: 'landing' },
                { view: 'results' },
              ],
            },
            signal => chai.expect(signal.serpShows.views.landing).to.eql(1))
          );
          it('counts `results` view impressions', () =>
            test({
              'metrics.experiments.serp.state': [{}],
              'metrics.experiments.serp.show': [
                { view: 'results' },
                { view: 'landing' },
                { view: 'results' },
              ],
            },
            signal => chai.expect(signal.serpShows.views.results).to.eql(2))
          );
        });
        context('serpSelections', function () {
          it('counts results', () =>
            test({
              'metrics.experiments.serp.state': [{}],
              'metrics.experiments.serp.click.result': [
                { source: 'm', isSearchEngine: true, index: 1 },
                { source: 'Z', isSearchEngine: false, index: 0 },
                { source: 'm', isSearchEngine: false, index: 42 },
              ],
            },
            signal => chai.expect(signal.serpSelections.result).to.deep.eql({
              total: 2,
              isSearchEngine: 1,
              index: {
                1: 1,
                rest: 1,
              },
            }))
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
              'metrics.experiments.serp.click.search': [
                { engine: 'duckduckgo' },
                { engine: 'cliqz' },
                { engine: 'google' },
                { engine: 'cliqz' },
              ],
            },
            signal => chai.expect(signal.serpSelections.other).to.eql(2))
          );

          it('counts query', () =>
            test({
              'metrics.experiments.serp.state': [{}],
              'metrics.experiments.serp.click.search': [
                { engine: 'duckduckgo', view: 'results' },
                { engine: 'cliqz', view: 'results' },
                { engine: 'google', view: 'results' },
                { engine: 'cliqz', view: 'landing' },
              ],
              'metrics.experiments.serp.enter.search': [
                { view: 'landing' },
                { view: 'landing' },
                { view: 'results' },
              ],
            },
            signal => chai.expect(signal.serpSelections.query).to.deep.eql({
              views: {
                landing: 3,
                results: 2,
              },
            }))
          );

          it('counts abandoned', () =>
            test({
              'metrics.experiments.serp.state': [{}],
              'metrics.experiments.serp.show': [
                { view: 'landing' },
                { view: 'landing' },
                { view: 'landing' },
                { view: 'landing' },
                { view: 'results' },
                { view: 'results' },
                { view: 'results' },
                { view: 'results' },
                { view: 'results' },
                { view: 'results' },
              ],
              'metrics.experiments.serp.click.result': [
                { source: 'Z', view: 'results' },
                { source: 'm', view: 'results' },
              ],
              'metrics.experiments.serp.click.search': [
                { engine: 'cliqz', view: 'results' },
                { engine: 'duckduckgo', view: 'results' },
                { engine: 'cliqz', view: 'landing' },
              ],
              'metrics.experiments.serp.enter.search': [
                { view: 'results' },
                { view: 'landing' },
              ],
            },
            signal => chai.expect(signal.serpSelections.abandoned).to.deep.eql({
              views: {
                landing: 2,
                results: 1,
              },
            }))
          );
        });
      });
    });
  },
});
