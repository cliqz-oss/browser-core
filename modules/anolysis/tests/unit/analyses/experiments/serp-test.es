/* global chai */

require('../../telemetry-schemas-test-helpers')({
  name: 'analyses.experiments.serp',
  metrics: [
    'metrics.core.abtests',
    'metrics.experiments.serp.state',
    'metrics.experiments.serp.click.result',
    'metrics.experiments.serp.click.search',
    'metrics.experiments.serp.enter.search',
    'metrics.experiments.serp.show',
    'metrics.experiments.serp.type',
  ],
  tests: (generateAnalysisResults) => {
    context('serp', function () {
      const test = async (metrics, check) => {
        const signals = await generateAnalysisResults(metrics);
        chai.expect(signals).to.have.length(1);
        return check(signals[0]);
      };

      context('state', function () {
        context('without new AB tests', function () {
          it('takes group from last state signal', () =>
            test({
              'metrics.experiments.serp.state': [
                { group: null },
                { group: 'A' },
              ],
              'metrics.core.abtests': [],
            },
            signal => chai.expect(signal).to.include({
              experiment: null,
              group: 'A',
            })));

          it('takes default from last state signal', () =>
            test({
              'metrics.experiments.serp.state': [
                { isCliqzDefaultEngine: false },
                { isCliqzDefaultEngine: true },
              ],
              'metrics.core.abtests': [],
            },
            signal => chai.expect(signal.isCliqzDefaultEngine).to.be.true));
        });
        context('with irrelevant new AB tests', function () {
          it('takes group from last state signal', () =>
            test({
              'metrics.experiments.serp.state': [
                { group: null },
                { group: 'A' },
              ],
              'metrics.core.abtests': [
                [
                  {
                    id: 42,
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
            signal => chai.expect(signal).to.include({
              experiment: null,
              group: 'A',
            })));

          it('takes default from last state signal', () =>
            test({
              'metrics.experiments.serp.state': [
                { isCliqzDefaultEngine: false },
                { isCliqzDefaultEngine: true },
              ],
              'metrics.core.abtests': [
                [
                  {
                    id: 42,
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
            signal => chai.expect(signal.isCliqzDefaultEngine).to.be.true));
        });
        context('with relevant new AB tests', function () {
          it('takes group and experiment ID from (first) AB test signal', () =>
            test({
              'metrics.experiments.serp.state': [
                { group: null },
                { group: 'A' },
              ],
              'metrics.core.abtests': [
                [
                  {
                    id: 42,
                    groups: {
                      A: {
                        'experiments.serp': 'offers_control',
                      },
                      B: {
                        'experiments.serp': 'offers_test',
                      },
                    },
                    group: 'B',
                  },
                ],
              ],
            },
            signal => chai.expect(signal).to.include({
              experiment: 42,
              group: 'B',
            })));

          it('takes default from last state signal', () =>
            test({
              'metrics.experiments.serp.state': [
                { isCliqzDefaultEngine: false },
                { isCliqzDefaultEngine: true },
              ],
              'metrics.core.abtests': [
                [
                  {
                    id: 42,
                    groups: {
                      A: {
                        'experiments.serp': 'offers_control',
                      },
                      B: {
                        'experiments.serp': 'offers_test',
                      },
                    },
                    group: 'B',
                  },
                ],
              ],
            },
            signal => chai.expect(signal.isCliqzDefaultEngine).to.be.true));
        });
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
            })));

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
            })));

        it('counts other selections', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'search.session': [
              { hasUserInput: true, selection: { origin: 'other' } },
              { hasUserInput: true, selection: { origin: 'other' } },
              { hasUserInput: true, selection: { origin: 'cliqz' } },
            ],
          },
          signal => chai.expect(signal.dropdownSelections.other).to.eql(2)));

        it('counts abandoned selections', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'search.session': [
              { hasUserInput: true, selection: { origin: null } },
              { hasUserInput: true, selection: { origin: 'other' } },
              { hasUserInput: true, selection: { origin: null } },
            ],
          },
          signal => chai.expect(signal.dropdownSelections.abandoned).to.eql(2)));
      });
      context('serpShows', function () {
        it('counts impressions with offers', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.show': [
              { view: 'results', offerCount: 0 },
              { view: 'landing', offerCount: 1 },
              { view: 'results', offerCount: 1 },
            ],
          },
          signal => chai.expect(signal.serpShows.withOffer).to.eql(2)));
        it('counts `landing` view impressions', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.show': [
              { view: 'results' },
              { view: 'landing' },
              { view: 'results' },
            ],
          },
          signal => chai.expect(signal.serpShows.views.landing).to.eql(1)));
        it('counts `results` view impressions', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.show': [
              { view: 'results' },
              { view: 'landing' },
              { view: 'results' },
            ],
          },
          signal => chai.expect(signal.serpShows.views.results).to.eql(2)));
        it('counts `withUserInput` impressions', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.show': [
              { session: 1 },
              { session: 2 },
              { session: 3 },
            ],
            'metrics.experiments.serp.type': [
              { session: 2 },
              { session: 3 },
              { session: 4 },
            ],
          },
          signal => chai.expect(signal.serpShows.withUserInput).to.deep.eql({
            true: 3, // session: 2, 3, 4
            false: 1, // session: 1
          })));
        it('counts `withAnySuggestions` impressions', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.show': [
              { session: 1 },
              { session: 2 },
              { session: 3 },
            ],
            'metrics.experiments.serp.type': [
              { session: 2, hasSuggestions: true },
              { session: 2, hasSuggestions: false },
              { session: 3, hasSuggestions: false },
              { session: 4, hasSuggestions: true },
            ],
          },
          signal => chai.expect(signal.serpShows.withAnySuggestions).to.deep.eql({
            true: 2, // session: 2, 4
            false: 2, // session: 1, 3
          })));
        it('counts `withFinalSuggestions` impressions', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.show': [
              { session: 1 },
            ],
            'metrics.experiments.serp.type': [
              { session: 2, hasSuggestions: false },
              { session: 2, hasSuggestions: true },
              { session: 3, hasSuggestions: true },
              { session: 3, hasSuggestions: false },
              { session: 4, hasSuggestions: true },
              { session: 4, hasSuggestions: false },
              { session: 5, hasSuggestions: false },
              { session: 5, hasSuggestions: true },
            ],
          },
          signal => chai.expect(signal.serpShows.withFinalSuggestions).to.deep.eql({
            true: 2, // session: 2, 5
            false: 3, // session: 1, 3, 4
          })));
      });
      context('serpSelections', function () {
        it('counts results', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.click.result': [
              { source: 'm', class: null, isSearchEngine: true, index: 1 },
              { source: 'Z', class: null, isSearchEngine: false, index: 0 },
              { source: 'm', class: null, isSearchEngine: false, index: 42 },
              { source: 'm', class: 'EntityKPI', isSearchEngine: false, index: 99 },
            ],
          },
          signal => chai.expect(signal.serpSelections.result).to.deep.eql({
            total: 2,
            isSearchEngine: 1,
            index: {
              1: 1,
              rest: 1,
            },
          })));

        it('counts offers', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.click.result': [
              { source: 'm', class: null, isSearchEngine: true, index: 1 },
              { source: 'Z', class: null, isSearchEngine: false, index: 0 },
              { source: 'm', class: null, isSearchEngine: false, index: 42 },
              { source: 'm', class: 'EntityKPI', isSearchEngine: false, index: 99 },
            ],
          },
          signal => chai.expect(signal.serpSelections.offer).to.eql(1)));

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
          signal => chai.expect(signal.serpSelections.suggestion).to.eql(3)));

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
          signal => chai.expect(signal.serpSelections.other).to.eql(2)));

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
          })));

        it('counts abandoned', () =>
          test({
            'metrics.experiments.serp.state': [{}],
            'metrics.experiments.serp.show': [
              { view: 'landing', session: 1 },
              { view: 'landing', session: 2 },
              { view: 'landing', session: 3 },
              { view: 'landing', session: 4 },
              { view: 'results', session: 5 },
              { view: 'results', session: 6 },
              { view: 'results', session: 7 },
              { view: 'results', session: 8 },
              { view: 'results', session: 9 },
              { view: 'results', session: 10 },
            ],
            'metrics.experiments.serp.click.result': [
              { source: 'Z', view: 'results', session: 5 },
              { source: 'm', view: 'results', session: 5 },
            ],
            'metrics.experiments.serp.click.search': [
              { engine: 'cliqz', view: 'results', session: 5 },
              { engine: 'duckduckgo', view: 'results', session: 5 },
              { engine: 'cliqz', view: 'landing', session: 5 },
            ],
            'metrics.experiments.serp.enter.search': [
              { view: 'results', session: 5 },
              { view: 'landing', session: 5 },
            ],
          },
          signal => chai.expect(signal.serpSelections.abandoned).to.deep.eql({
            views: {
              landing: 4, // session: 1, 2, 3, 4
              results: 5, // session: 6, 7, 8, 9, 10
            },
          })));
      });
    });
  },
});
