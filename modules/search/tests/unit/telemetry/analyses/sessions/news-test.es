/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/*
 * news-search allows us to know how our users interact with our news in search
 * there are main two types of news in the search results,
 * NSD: news stories of the day, news search results triggred by terms
 * SC: smart cliqz news is triggred by domain names
 * news-search analysis depends on search metric "search.metric.session.interaction"
 * and search analysis
*/

require('../../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'search.analysis.sessions.news',
  metrics: ['search.metric.session.interaction'],
  schemas: [
    'search/telemetry/metrics/session/interaction',
    'search/telemetry/analyses/sessions/news',
  ],
  tests: (generateAnalysisResults) => {
    const test = async (metrics, check) => {
      const signals = await generateAnalysisResults({
        'search.metric.session.interaction': metrics,
      });
      chai.expect(signals).to.have.length(1);
      check(signals[0]);
    };

    context('news stories of the day', function () {
      const nsdResults = [
        {
          sources: [
            'm'
          ],
          classes: []
        },
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'SoccerEZ'
          ]
        }
      ];
      const nonNsdResults = [
        {
          sources: [
            'm'
          ],
          classes: []
        },
        {
          sources: [
            'w'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'SoccerEZ'
          ]
        }
      ];
      const mkNsdSignal = (hasUserInput = true, results, index = 0, sources = ['n'], action = 'click') => ({
        hasUserInput,
        results,
        selection: { index, sources, action },
      });
      context('results', function () {
        context('total count', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.nsd.results.total).to.be.eql(0)));

          it('some results', () =>
            test([
              { hasUserInput: true, results: nsdResults },
              { hasUserInput: true, results: nsdResults }
            ],
            signal => chai.expect(signal.nsd.results.total).to.be.eql(2)));

          it('mixed results', () =>
            test([{ hasUserInput: true, results: nsdResults }, {}],
              signal => chai.expect(signal.nsd.results.total).to.be.eql(1)));

          it('non news results', () =>
            test([
              { hasUserInput: true, results: nonNsdResults },
              { hasUserInput: true, results: nonNsdResults }
            ],
            signal => chai.expect(signal.nsd.results.total).to.be.eql(0)));

          it('mixed news/non news results', () =>
            test([
              { hasUserInput: true, results: nonNsdResults },
              { hasUserInput: true, results: nsdResults }
            ],
            signal => chai.expect(signal.nsd.results.total).to.be.eql(1)));
        });

        context('results index', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.nsd.results.index).to.be.eql({})));

          it('single result', () =>
            test([
              { hasUserInput: true, results: nsdResults },
              { hasUserInput: true, results: nonNsdResults }
            ],
            signal => chai.expect(signal.nsd.results.index).to.be.eql({ 1: 1 })));

          it('multiple results', () =>
            test([
              { hasUserInput: true, results: nsdResults },
              { hasUserInput: true, results: nsdResults }
            ],
            signal => chai.expect(signal.nsd.results.index).to.be.eql({ 1: 2 })));

          it('multiple index results', () =>
            test([
              { hasUserInput: true, results: nsdResults },
              { hasUserInput: true, results: [{ sources: ['n'], classes: [] }] }
            ],
            signal => chai.expect(signal.nsd.results.index).to.be.eql({ 0: 1, 1: 1 })));
        });

        context('results size', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.nsd.results.size).to.be.eql({})));

          it('single result', () =>
            test([{ hasUserInput: true, results: nsdResults }, {}],
              signal => chai.expect(signal.nsd.results.size).to.be.eql({ 3: 1 })));

          it('multiple results', () =>
            test([{ hasUserInput: true, results: nsdResults }, { hasUserInput: true, results: nsdResults }, { hasUserInput: true, results: [{ sources: ['n'], classes: [] }] }],
              signal => chai.expect(signal.nsd.results.size).to.be.eql({ 1: 1, 3: 2 })));

          it('mixed news/non news results', () =>
            test([
              { hasUserInput: true, results: nonNsdResults },
              { hasUserInput: true, results: nsdResults }
            ],
            signal => chai.expect(signal.nsd.results.size).to.be.eql({ 3: 1 })));
        });
      });

      context('selections', function () {
        context('total count', function () {
          it('with user input', () =>
            test([mkNsdSignal(true, nsdResults), mkNsdSignal(true, nsdResults)],
              signal => chai.expect(signal.nsd.selections.total).to.be.eql(2)));

          it('without user input', () =>
            test([mkNsdSignal(false, nsdResults), mkNsdSignal(false, nsdResults)],
              signal => chai.expect(signal.nsd.selections.total).to.be.eql(0)));

          it('with and without user input', () =>
            test([mkNsdSignal(false, nsdResults), mkNsdSignal(true, nsdResults)],
              signal => chai.expect(signal.nsd.selections.total).to.be.eql(1)));
        });

        context('index', function () {
          it('single selection', () =>
            test([
              mkNsdSignal(true, nsdResults),
            ], signal => chai.expect(signal.nsd.selections.index).to.deep.eql({
              0: 1,
            })));

          it('multiple selections', () =>
            test([
              mkNsdSignal(true, nsdResults),
              mkNsdSignal(true, nsdResults),
              mkNsdSignal(true, nsdResults, 1),
              mkNsdSignal(true, nsdResults, 4),
            ], signal => chai.expect(signal.nsd.selections.index).to.deep.eql({
              0: 2,
              1: 1,
              4: 1,
            })));

          it('multiple selections with overflow', () =>
            test([
              mkNsdSignal(true, nsdResults),
              mkNsdSignal(true, nsdResults, 15),
              mkNsdSignal(true, nsdResults, 16),
              mkNsdSignal(true, nsdResults, 20),
            ], signal => chai.expect(signal.nsd.selections.index).to.deep.eql({
              0: 1,
              15: 1,
              rest: 2,
            })));
        });

        context('action', function () {
          it('click', () =>
            test([
              mkNsdSignal(true, nsdResults, 0, ['n'], 'click'),
              mkNsdSignal(true, nsdResults, 0, ['n'], 'click'),
              mkNsdSignal(true, nsdResults, 0, ['n'], 'enter'),
            ], signal => chai.expect(signal.nsd.selections.action.click).to.eql(2)));

          it('enter', () =>
            test([
              mkNsdSignal(true, nsdResults, 0, ['n'], 'click'),
              mkNsdSignal(true, nsdResults, 0, ['n'], 'enter'),
              mkNsdSignal(true, nsdResults, 0, ['n'], 'enter'),
            ], signal => chai.expect(signal.nsd.selections.action.enter).to.eql(2)));
        });
      });
    });

    context('smart cliqz', function () {
      const scNewsResults = [
        {
          sources: [
            'm'
          ],
          classes: []
        },
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'EntityNews'
          ]
        }
      ];
      const nonSCNewsResults = [
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'w'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'SoccerEZ'
          ]
        }
      ];
      const scNewsWithHistoryResults = [
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'H'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'EntityNews'
          ]
        }
      ];

      const scNewsWithHistoryResults2 = [
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'C'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'EntityNews'
          ]
        }
      ];
      const mkSCNewsSignal = (hasUserInput = true, results, index = 0, sources = ['X'], classes = ['EntityNews'], action = 'click', subResult = { type: 'news', index: 0 }) => ({
        hasUserInput,
        results,
        selection: { index, sources, action, classes, subResult },
      });

      context('results', function () {
        context('total count', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.scNews.results.total).to.be.eql(0)));

          it('some results', () =>
            test([
              { hasUserInput: true, results: scNewsResults },
              { hasUserInput: true, results: scNewsResults }
            ],
            signal => chai.expect(signal.scNews.results.total).to.be.eql(2)));

          it('mixed results', () =>
            test([{ hasUserInput: true, results: scNewsResults }, {}],
              signal => chai.expect(signal.scNews.results.total).to.be.eql(1)));

          it('non news results', () =>
            test([
              { hasUserInput: true, results: nonSCNewsResults },
              { hasUserInput: true, results: nonSCNewsResults }
            ],
            signal => chai.expect(signal.scNews.results.total).to.be.eql(0)));

          it('mixed news/non news results', () =>
            test([
              { hasUserInput: true, results: nonSCNewsResults },
              { hasUserInput: true, results: scNewsResults }
            ],
            signal => chai.expect(signal.scNews.results.total).to.be.eql(1)));
        });

        context('withHistory count', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.scNews.results.withHistory).to.be.eql(0)));

          it('some results', () =>
            test([
              { hasUserInput: true, results: scNewsWithHistoryResults },
              { hasUserInput: true, results: scNewsWithHistoryResults }
            ],
            signal => chai.expect(signal.scNews.results.withHistory).to.be.eql(2)));

          it('mixed with empty results', () =>
            test([{ hasUserInput: true, results: scNewsWithHistoryResults }, {}],
              signal => chai.expect(signal.scNews.results.withHistory).to.be.eql(1)));

          it('mixed with non news results', () =>
            test([
              { hasUserInput: true, results: scNewsWithHistoryResults },
              { hasUserInput: true, results: nonSCNewsResults }
            ],
            signal => chai.expect(signal.scNews.results.withHistory).to.be.eql(1)));

          it('mixed with non history results', () =>
            test([
              { hasUserInput: true, results: scNewsWithHistoryResults },
              { hasUserInput: true, results: scNewsResults }
            ],
            signal => chai.expect(signal.scNews.results.withHistory).to.be.eql(1)));

          it('cluster mixed with non history results', () =>
            test([
              { hasUserInput: true, results: scNewsWithHistoryResults2 },
              { hasUserInput: true, results: scNewsResults }
            ],
            signal => chai.expect(signal.scNews.results.withHistory).to.be.eql(1)));
        });

        context('results index', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.scNews.results.index).to.be.eql({})));

          it('single result', () =>
            test([
              { hasUserInput: true, results: scNewsResults },
              { hasUserInput: true, results: nonSCNewsResults }
            ],
            signal => chai.expect(signal.scNews.results.index).to.be.eql({ 2: 1 })));

          it('multiple results', () =>
            test([
              { hasUserInput: true, results: scNewsResults },
              { hasUserInput: true, results: scNewsResults }],
            signal => chai.expect(signal.scNews.results.index).to.be.eql({ 2: 2 })));

          it('multiple index results', () =>
            test([{ hasUserInput: true, results: scNewsResults }, { hasUserInput: true, results: [{ sources: ['X'], classes: ['EntityNews'] }] }],
              signal => chai.expect(signal.scNews.results.index).to.be.eql({ 0: 1, 2: 1 })));
        });
      });

      context('selections', function () {
        context('total count', function () {
          it('with user input', () =>
            test([mkSCNewsSignal(true, scNewsResults), mkSCNewsSignal(true, scNewsResults)],
              signal => chai.expect(signal.scNews.selections.total).to.be.eql(2)));

          it('without user input', () =>
            test([mkSCNewsSignal(false, scNewsResults), mkSCNewsSignal(false, scNewsResults)],
              signal => chai.expect(signal.scNews.selections.total).to.be.eql(0)));

          it('with and without user input', () =>
            test([mkSCNewsSignal(false, scNewsResults), mkSCNewsSignal(true, scNewsResults)],
              signal => chai.expect(signal.scNews.selections.total).to.be.eql(1)));

          it('mixied types', () =>
            test([
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 0 }),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'breaking_news', index: 0 }),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'internal', index: 0 }),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', {}),
            ],
            signal => chai.expect(signal.scNews.selections.total).to.be.eql(3)));

          it('mixied with empty selections', () =>
            test([
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 0 }),
              mkSCNewsSignal(true, scNewsResults, 0, [], [], '', {}),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'internal', index: 0 }),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', {}),
            ],
            signal => chai.expect(signal.scNews.selections.total).to.be.eql(2)));
        });

        context('history', function () {
          context('smart cliqz history', function () {
            it('with user input', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'click', { type: 'history', index: 0 })
              ],
              signal => chai.expect(signal.scNews.selections.history).to.be.eql(2)));

            it('without user input', () =>
              test([
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'click', { type: 'history', index: 0 }),
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'enter', { type: 'history', index: 0 })
              ],
              signal => chai.expect(signal.scNews.selections.history).to.be.eql(0)));

            it('not smart cliqz', () =>
              test([
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['H'], [], 'click', { type: 'history', index: 0 }),
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['C'], [], 'enter', { type: 'history', index: 0 })
              ],
              signal => chai.expect(signal.scNews.selections.history).to.be.eql(0)));

            it('with and without user input', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'click', { type: 'history', index: 0 }),
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'click', { type: 'history', index: 0 })
              ],
              signal => chai.expect(signal.scNews.selections.history).to.be.eql(1)));

            it('mixed with non history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsResults, 0, ['X', 'H'], ['EntityNews'], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.history).to.be.eql(1)));

            it(' mixed with non history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults2, 0, ['H', 'X'], ['EntityNews'], 'enter', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsResults, 0, ['X', 'H'], ['EntityNews'], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.history).to.be.eql(1)));

            it('mixed with domain history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'click', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsResults, 0, ['X', 'H'], ['EntityNews'], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.history).to.be.eql(2)));
          });

          context('smart cliqz Domain History', function () {
            it('with user input', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'click', {})
              ],
              signal => chai.expect(signal.scNews.selections.domainHistory).to.be.eql(2)));

            it('without user input', () =>
              test([
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'click', {}),
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'enter', {})
              ],
              signal => chai.expect(signal.scNews.selections.domainHistory).to.be.eql(0)));

            it('not smart cliqz', () =>
              test([
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['H'], ['EntityNews'], 'click', {}),
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['C'], ['EntityNews'], 'enter', {})
              ],
              signal => chai.expect(signal.scNews.selections.domainHistory).to.be.eql(0)));

            it('with and without user input', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'click', {}),
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'click', {})
              ],
              signal => chai.expect(signal.scNews.selections.domainHistory).to.be.eql(1)));

            it('mixed with non history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', {}),
                mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.domainHistory).to.be.eql(1)));

            it('mixed with non history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults2, 0, ['H', 'X'], ['EntityNews'], 'enter', {}),
                mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.domainHistory).to.be.eql(1)));

            it('mixed with sc history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'click', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.domainHistory).to.be.eql(2)));
          });

          context('Other History', function () {
            it('with user input', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H'], [], 'enter', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C'], [], 'click', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C'], [], 'click', {})
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(3)));

            it('without user input', () =>
              test([
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['H'], [], 'click', {}),
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['C'], [], 'enter', {})
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(0)));

            it('smart cliqz', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X'], [], 'click', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X'], [], 'enter', {})
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(0)));

            it('mixed with smart cliqz', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X', 'H'], [], 'click', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C'], [], 'enter', {})
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(1)));

            it('with and without user input', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'C'], [], 'click', {}),
                mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['C'], [], 'click', {})
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(1)));

            it('mixed with non history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H'], [], 'enter', {}),
                mkSCNewsSignal(true, scNewsResults, 0, ['X'], [], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(1)));

            it('mixed with non history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults2, 0, ['H'], [], 'enter', {}),
                mkSCNewsSignal(true, scNewsResults, 0, ['X'], [], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(1)));

            it('mixed with sc/domain history results', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'C'], [], 'enter', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H'], [], 'enter', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], [], 'click', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H'], [], 'click', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsResults, 0, ['X'], [], 'enter')
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(3)));
          });

          context('Mixed History', function () {
            it(' contains sc history and sc news', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', { type: 'history', index: 1 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C'], [], 'click', {})
              ],
              signal => chai.expect(signal.scNews.selections.history).to.be.eql(2)));

            it(' contains sc history and sc news and domainHistory', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', { type: 'history', index: 1 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C'], [], 'click', {})
              ],
              signal => chai.expect(signal.scNews.selections.domainHistory).to.be.eql(3)));

            it(' contains sc history and sc news and domainHistory and otherHistory', () =>
              test([
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H', 'X'], ['EntityNews'], 'enter', { type: 'history', index: 0 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', { type: 'history', index: 1 }),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'X'], ['EntityNews'], 'cliqz', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H'], [], 'click', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C', 'H'], [], 'click', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C'], [], 'click', {}),
                mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['C'], [], 'enter', {})
              ],
              signal => chai.expect(signal.scNews.selections.otherHistory).to.be.eql(4)));
          });
        });

        context('index', function () {
          it('single selection', () =>
            test([
              mkSCNewsSignal(true, scNewsResults),
            ], signal => chai.expect(signal.scNews.selections.index).to.deep.eql({
              0: 1,
            })));

          it('multiple selections', () =>
            test([
              mkSCNewsSignal(true, scNewsResults),
              mkSCNewsSignal(true, scNewsResults, 1),
              mkSCNewsSignal(true, scNewsResults, 1),
              mkSCNewsSignal(true, scNewsResults, 4),
            ], signal => chai.expect(signal.scNews.selections.index).to.deep.eql({
              0: 1,
              1: 2,
              4: 1,
            })));
          it('multiple selections with history', () =>
            test([
              mkSCNewsSignal(true, scNewsResults),
              mkSCNewsSignal(true, scNewsResults, 1),
              mkSCNewsSignal(true, scNewsResults, 1),
              mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H'], [], 'enter', { type: 'history', index: 0 }),
              mkSCNewsSignal(true, scNewsResults, 4),
            ], signal => chai.expect(signal.scNews.selections.index).to.deep.eql({
              0: 1,
              1: 2,
              4: 1,
            })));
          it('multiple selections with overflow', () =>
            test([
              mkSCNewsSignal(true, scNewsResults),
              mkSCNewsSignal(true, scNewsResults, 15),
              mkSCNewsSignal(true, scNewsResults, 16),
              mkSCNewsSignal(true, scNewsResults, 20),
              mkSCNewsSignal(true, scNewsResults, 20),
            ], signal => chai.expect(signal.scNews.selections.index).to.deep.eql({
              0: 1,
              15: 1,
              rest: 3,
            })));
        });
        context('subResult', function () {
          context('news', function () {
            context('total count', function () {
              it('with user input', () =>
                test([
                  mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 0 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 0 }),
                ],
                signal => chai.expect(signal.scNews.selections.subResult.news.total).to.be.eql(2)));

              it('without user input', () =>
                test([
                  mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['X'], ['EntityNews'], 'click', { type: 'news', index: 2 }),
                  mkSCNewsSignal(false, scNewsResults, 0, ['X'], ['EntityNews'], 'click', { type: 'news', index: 0 }),
                ],
                signal => chai.expect(signal.scNews.selections.subResult.news.total).to.be.eql(0)));

              it('mixed selections', () =>
                test([
                  mkSCNewsSignal(true, scNewsResults, 0, ['n'], [], 'click', { type: 'internal', index: 0 }),
                  mkSCNewsSignal(true, scNewsResults, 3, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 1 })
                ],
                signal => chai.expect(signal.scNews.selections.subResult.news.total).to.be.eql(1)));
            });

            context('index', function () {
              it('single selection', () =>
                test([
                  mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 0 }),
                ],
                signal => chai.expect(signal.scNews.selections.subResult.news.index)
                  .to.deep.eql({ 0: 1 })));

              it('multiple and mixed selections', () =>
                test([
                  mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 0 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'click', { type: 'news', index: 1 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 2 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 1 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'click', { type: 'internal', index: 1 }),
                ],
                signal => chai.expect(signal.scNews.selections.subResult.news.index).to.deep.eql({
                  0: 1,
                  1: 2,
                  2: 1,
                })));

              it('multiple selections with history', () =>
                test([
                  mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 0 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'click', { type: 'news', index: 1 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 2 }),
                  mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['H'], [], 'click', { type: 'history', index: 0 }),
                  mkSCNewsSignal(true, scNewsResults, 4),
                ],
                signal => chai.expect(signal.scNews.selections.subResult.news.index).to.deep.eql({
                  0: 2,
                  1: 1,
                  2: 1,
                })));

              it('multiple selections with overflow', () =>
                test([
                  mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 0 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'click', { type: 'news', index: 18 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'news', index: 22 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'click', { type: 'news', index: 15 }),
                ],
                signal => chai.expect(signal.scNews.selections.subResult.news.index).to.deep.eql({
                  0: 1,
                  15: 1,
                  rest: 2,
                })));
            });
          });
          context('category', function () {

          });
          context('breakign news', function () {
            context('total count', function () {
              it('with user input', () =>
                test([
                  mkSCNewsSignal(true, scNewsWithHistoryResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'breaking_news', index: 0 }),
                  mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter', { type: 'breaking_news', index: 0 }),
                ],
                signal => chai.expect(signal.scNews.selections.subResult.breaking).to.be.eql(2)));

              it('without user input', () =>
                test([
                  mkSCNewsSignal(false, scNewsWithHistoryResults, 0, ['X'], ['EntityNews'], 'click', { type: 'breaking_news', index: 2 }),
                  mkSCNewsSignal(false, scNewsResults, 0, ['X'], ['EntityNews'], 'click', { type: 'breaking_news', index: 0 }),
                ],
                signal => chai.expect(signal.scNews.selections.subResult.breaking).to.be.eql(0)));

              it('mixed selections', () =>
                test([
                  mkSCNewsSignal(true, scNewsResults, 0, ['n'], [], 'click', { type: 'internal', index: 0 }),
                  mkSCNewsSignal(true, scNewsResults, 3, ['X'], ['EntityNews'], 'enter', { type: 'breaking_news', index: 1 })
                ],
                signal => chai.expect(signal.scNews.selections.subResult.breaking).to.be.eql(1)));
            });
          });
        });

        context('action', function () {
          it('click', () =>
            test([
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'click'),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'click'),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter'),
            ], signal => chai.expect(signal.scNews.selections.action.click).to.eql(2)));

          it('enter', () =>
            test([
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'click'),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter'),
              mkSCNewsSignal(true, scNewsResults, 0, ['X'], ['EntityNews'], 'enter'),
            ], signal => chai.expect(signal.scNews.selections.action.enter).to.eql(2)));
        });
      });
    });

    context('top news smart cliqz', function () {
      const scTopNewsResults = [
        {
          sources: [
            'm'
          ],
          classes: []
        },
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'EntityTopNews'
          ]
        }
      ];
      const nonscTopNewsResults = [
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'w'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'SoccerEZ'
          ]
        }
      ];
      const scTopNewsWithHistoryResults = [
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'H'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'EntityTopNews'
          ]
        }
      ];
      const scTopNewsWithHistoryResults2 = [
        {
          sources: [
            'n'
          ],
          classes: []
        },
        {
          sources: [
            'C'
          ],
          classes: []
        },
        {
          sources: [
            'X'
          ],
          classes: [
            'EntityTopNews'
          ]
        }
      ];
      const mkscTopNewsSignal = (hasUserInput = true, results, index = 0, sources = ['X'], classes = ['EntityTopNews'], action = 'click', subResult = { type: 'news', index: 0 }) => ({
        hasUserInput,
        results,
        selection: { index, sources, action, classes, subResult },
      });

      context('results', function () {
        context('total count', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.scTopNews.results.total).to.be.eql(0)));

          it('some results', () =>
            test([
              { hasUserInput: true, results: scTopNewsResults },
              { hasUserInput: true, results: scTopNewsResults }
            ],
            signal => chai.expect(signal.scTopNews.results.total).to.be.eql(2)));

          it('mixed results', () =>
            test([{ hasUserInput: true, results: scTopNewsResults }, {}],
              signal => chai.expect(signal.scTopNews.results.total).to.be.eql(1)));

          it('non news results', () =>
            test([
              { hasUserInput: true, results: nonscTopNewsResults },
              { hasUserInput: true, results: nonscTopNewsResults }
            ],
            signal => chai.expect(signal.scTopNews.results.total).to.be.eql(0)));

          it('mixed news/non news results', () =>
            test([
              { hasUserInput: true, results: nonscTopNewsResults },
              { hasUserInput: true, results: scTopNewsResults }
            ],
            signal => chai.expect(signal.scTopNews.results.total).to.be.eql(1)));
        });

        context('withHistory count', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.scTopNews.results.withHistory).to.be.eql(0)));

          it('some results', () =>
            test([
              { hasUserInput: true, results: scTopNewsWithHistoryResults },
              { hasUserInput: true, results: scTopNewsWithHistoryResults }
            ],
            signal => chai.expect(signal.scTopNews.results.withHistory).to.be.eql(2)));

          it('mixed with empty results', () =>
            test([{ hasUserInput: true, results: scTopNewsWithHistoryResults }, {}],
              signal => chai.expect(signal.scTopNews.results.withHistory).to.be.eql(1)));

          it('mixed with non news results', () =>
            test([
              { hasUserInput: true, results: scTopNewsWithHistoryResults },
              { hasUserInput: true, results: nonscTopNewsResults }
            ],
            signal => chai.expect(signal.scTopNews.results.withHistory).to.be.eql(1)));

          it('mixed with non history results', () =>
            test([
              { hasUserInput: true, results: scTopNewsWithHistoryResults },
              { hasUserInput: true, results: scTopNewsResults }
            ],
            signal => chai.expect(signal.scTopNews.results.withHistory).to.be.eql(1)));

          it('cluster mixed with non history results', () =>
            test([
              { hasUserInput: true, results: scTopNewsWithHistoryResults2 },
              { hasUserInput: true, results: scTopNewsResults }
            ],
            signal => chai.expect(signal.scTopNews.results.withHistory).to.be.eql(1)));
        });

        context('results index', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.scTopNews.results.index).to.be.eql({})));

          it('single result', () =>
            test([
              { hasUserInput: true, results: scTopNewsResults },
              { hasUserInput: true, results: nonscTopNewsResults }
            ],
            signal => chai.expect(signal.scTopNews.results.index).to.be.eql({ 2: 1 })));

          it('multiple results', () =>
            test([
              { hasUserInput: true, results: scTopNewsResults },
              { hasUserInput: true, results: scTopNewsResults }
            ],
            signal => chai.expect(signal.scTopNews.results.index).to.be.eql({ 2: 2 })));

          it('multiple index results', () =>
            test([
              { hasUserInput: true, results: scTopNewsResults },
              { hasUserInput: true, results: [{ sources: ['X'], classes: ['EntityTopNews'] }] }
            ],
            signal => chai.expect(signal.scTopNews.results.index).to.be.eql({ 0: 1, 2: 1 })));
        });
      });

      context('selections', function () {
        context('total count', function () {
          it('with user input', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsResults),
              mkscTopNewsSignal(true, scTopNewsResults)
            ],
            signal => chai.expect(signal.scTopNews.selections.total).to.be.eql(2)));

          it('without user input', () =>
            test([
              mkscTopNewsSignal(false, scTopNewsResults),
              mkscTopNewsSignal(false, scTopNewsResults)
            ],
            signal => chai.expect(signal.scTopNews.selections.total).to.be.eql(0)));

          it('with and without user input', () =>
            test([
              mkscTopNewsSignal(false, scTopNewsResults),
              mkscTopNewsSignal(true, scTopNewsResults)
            ],
            signal => chai.expect(signal.scTopNews.selections.total).to.be.eql(1)));

          it('mixied types', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'breaking_news', index: 0 }),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
              mkscTopNewsSignal(true, nonscTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
              mkscTopNewsSignal(true, nonscTopNewsResults, 0, ['X'], ['EntityNews'], 'enter', {}),
            ],
            signal => chai.expect(signal.scTopNews.selections.total).to.be.eql(3)));
        });

        context('history', function () {
          it('with user input', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['H'], ['EntityTopNews'], 'enter', {}),
              mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['C', 'H'], ['EntityTopNews'], 'click', {})
            ],
            signal => chai.expect(signal.scTopNews.selections.history).to.be.eql(2)));

          it('without user input', () =>
            test([
              mkscTopNewsSignal(false, scTopNewsWithHistoryResults, 0, ['H'], ['EntityTopNews'], 'click', {}),
              mkscTopNewsSignal(false, scTopNewsWithHistoryResults, 0, ['C'], ['EntityTopNews'], 'enter', {})
            ],
            signal => chai.expect(signal.scTopNews.selections.history).to.be.eql(0)));

          it('not smart cliqz', () =>
            test([
              mkscTopNewsSignal(true, nonscTopNewsResults, 0, ['H'], ['EntityNews'], 'click', {}),
              mkscTopNewsSignal(true, nonscTopNewsResults, 0, ['C'], ['EntityNews'], 'enter', {})
            ],
            signal => chai.expect(signal.scTopNews.selections.history).to.be.eql(0)));

          it('with and without user input', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['H'], ['EntityTopNews'], 'click', {}),
              mkscTopNewsSignal(false, scTopNewsWithHistoryResults, 0, ['C', 'H'], ['EntityTopNews'], 'click', {})
            ],
            signal => chai.expect(signal.scTopNews.selections.history).to.be.eql(1)));

          it('mixed with non history results', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['H'], ['EntityTopNews'], 'enter', {}),
              mkscTopNewsSignal(true, nonscTopNewsResults, 0, ['H'], ['EntityTopNews'], 'enter')
            ],
            signal => chai.expect(signal.scTopNews.selections.history).to.be.eql(1)));

          it('mixed with domain history results', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['H', 'C'], ['EntityTopNews'], 'enter', {}),
              mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['H'], ['EntityTopNews'], 'enter', {}),
              mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['C', 'H'], ['EntityTopNews'], 'click', {}),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X', 'H'], ['EntityTopNews'], 'enter')
            ],
            signal => chai.expect(signal.scTopNews.selections.history).to.be.eql(3)));
        });

        context('index', function () {
          it('single selection', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsResults),
            ],
            signal => chai.expect(signal.scTopNews.selections.index).to.deep.eql({ 0: 1 })));

          it('multiple selections', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsResults),
              mkscTopNewsSignal(true, scTopNewsResults, 1),
              mkscTopNewsSignal(true, scTopNewsResults, 1),
              mkscTopNewsSignal(true, scTopNewsResults, 4),
            ],
            signal => chai.expect(signal.scTopNews.selections.index)
              .to.deep.eql({ 0: 1, 1: 2, 4: 1 })));

          it('multiple selections with history', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsResults),
              mkscTopNewsSignal(true, scTopNewsResults, 1),
              mkscTopNewsSignal(true, scTopNewsResults, 1),
              mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['H'], [], 'enter', { type: 'history', index: 0 }),
              mkscTopNewsSignal(true, scTopNewsResults, 4),
            ],
            signal => chai.expect(signal.scTopNews.selections.index)
              .to.deep.eql({ 0: 1, 1: 2, 4: 1 })));

          it('multiple selections with overflow', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsResults),
              mkscTopNewsSignal(true, scTopNewsResults, 15),
              mkscTopNewsSignal(true, scTopNewsResults, 16),
              mkscTopNewsSignal(true, scTopNewsResults, 20),
              mkscTopNewsSignal(true, scTopNewsResults, 20),
            ],
            signal => chai.expect(signal.scTopNews.selections.index)
              .to.deep.eql({ 0: 1, 15: 1, rest: 3 })));
        });

        context('subResult', function () {
          context('news', function () {
            context('total count', function () {
              it('with user input', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.news.total)
                  .to.be.eql(2)));

              it('without user input', () =>
                test([
                  mkscTopNewsSignal(false, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'news', index: 2 }),
                  mkscTopNewsSignal(false, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'news', index: 0 }),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.news.total)
                  .to.be.eql(0)));

              it('mixed selections', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['n'], [], 'click', { type: 'internal', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 3, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 1 })
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.news.total)
                  .to.be.eql(1)));
            });

            context('index', function () {
              it('single selection', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.news.index)
                  .to.deep.eql({ 0: 1 })));

              it('multiple and mixed selections', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'news', index: 1 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 2 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 1 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'internal', index: 1 }),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.news.index)
                  .to.deep.eql({ 0: 1, 1: 2, 2: 1 })));

              it('multiple and mixed with non top news', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityNews'], 'click', { type: 'news', index: 1 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 2 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 1 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'internal', index: 1 }),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.news.index)
                  .to.deep.eql({ 0: 1, 1: 1, 2: 1 })));

              it('multiple selections with history', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'news', index: 1 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 2 }),
                  mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['H'], [], 'click', { type: 'history', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 4),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.news.index)
                  .to.deep.eql({ 0: 2, 1: 1, 2: 1 })));

              it('multiple selections with overflow', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'news', index: 18 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 22 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'news', index: 15 }),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.news.index)
                  .to.deep.eql({ 0: 1, 15: 1, rest: 2 })));
            });
          });

          context('breakign news', function () {
            context('total count', function () {
              it('with user input', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'breaking_news', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter', { type: 'breaking_news', index: 0 }),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.breaking)
                  .to.be.eql(2)));

              it('without user input', () =>
                test([
                  mkscTopNewsSignal(false, scTopNewsWithHistoryResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'breaking_news', index: 2 }),
                  mkscTopNewsSignal(false, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click', { type: 'breaking_news', index: 0 }),
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.breaking)
                  .to.be.eql(0)));

              it('mixed selections', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['n'], [], 'click', { type: 'internal', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 3, ['X'], ['EntityTopNews'], 'enter', { type: 'breaking_news', index: 1 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 3, ['X'], ['EntityTopNews'], 'enter', { type: 'news', index: 1 })
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.breaking)
                  .to.be.eql(1)));

              it('mixed with non top news', () =>
                test([
                  mkscTopNewsSignal(true, scTopNewsResults, 0, ['n'], [], 'click', { type: 'internal', index: 0 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 3, ['X'], ['EntityTopNews'], 'enter', { type: 'breaking_news', index: 1 }),
                  mkscTopNewsSignal(true, scTopNewsResults, 3, ['X'], ['EntityNews'], 'enter', { type: 'breaking_news', index: 1 })
                ],
                signal => chai.expect(signal.scTopNews.selections.subResult.breaking)
                  .to.be.eql(1)));
            });
          });
        });
        context('action', function () {
          it('click', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click'),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click'),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click'),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter'),
            ],
            signal => chai.expect(signal.scTopNews.selections.action.click).to.eql(3)));

          it('enter', () =>
            test([
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click'),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'click'),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter'),
              mkscTopNewsSignal(true, scTopNewsResults, 0, ['X'], ['EntityTopNews'], 'enter'),
            ],
            signal => chai.expect(signal.scTopNews.selections.action.enter).to.eql(2)));
        });
      });
    });
  },
});
