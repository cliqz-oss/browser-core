/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'search.analysis.sessions.interaction',
  metrics: ['search.metric.session.interaction'],
  schemas: [
    'search/telemetry/metrics/session/interaction',
    'search/telemetry/analyses/sessions/interaction',
  ],
  tests: (generateAnalysisResults) => {
    const mkResult = (sources = [], classes = []) => ({
      sources,
      classes,
    });
    const results = [
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

    const test = async (metrics, check) => {
      const signals = await generateAnalysisResults({
        'search.metric.session.interaction': metrics,
      });
      chai.expect(signals).to.have.length(1);
      check(signals[0]);
    };

    context('entryPoints', function () {
      context('counting entry points', function () {
        it('no entry points', () =>
          test([{ results: [] }],
            signal => chai.expect(signal.entryPoints).to.deep.eql({})));

        it('some entry points', () =>
          test([
            { hasUserInput: true, entryPoint: 'newTab', results: [] },
            { hasUserInput: true, entryPoint: 'browserBar', results: [] }
          ], (signal) => {
            chai.expect(signal.entryPoints.newTab).to.be.eql(1);
            chai.expect(signal.entryPoints.browserBar).to.be.eql(1);
          }));
      });
    });

    context('highlightCounts', function () {
      it('single session', () =>
        test([
          { hasUserInput: true, highlightCount: 0 },
        ], signal => chai.expect(signal.highlightCounts).to.deep.eql({
          0: 1,
        })));

      it('multiple sessions', () =>
        test([
          { hasUserInput: true, highlightCount: 0 },
          { hasUserInput: true, highlightCount: 0 },
          { hasUserInput: true, highlightCount: 1 },
          { hasUserInput: true, highlightCount: 3 },
        ], signal => chai.expect(signal.highlightCounts).to.deep.eql({
          0: 2,
          1: 1,
          3: 1,
        })));

      it('multiple sessions with overflow', () =>
        test([
          { hasUserInput: true, highlightCount: 0 },
          { hasUserInput: true, highlightCount: 1 },
          { hasUserInput: true, highlightCount: 17 },
          { hasUserInput: true, highlightCount: 20 },
        ], signal => chai.expect(signal.highlightCounts).to.deep.eql({
          0: 1,
          1: 1,
          rest: 2,
        })));
    });

    context('results', function () {
      context('total count', function () {
        it('empty results', () =>
          test([{ hasUserInput: true, results: [] }],
            signal => chai.expect(signal.results.total).to.be.eql(0)));

        it('some results', () =>
          test([{ hasUserInput: true, results }, { hasUserInput: true, results }],
            signal => chai.expect(signal.results.total).to.be.eql(2)));

        it('mixed results', () =>
          test([{ hasUserInput: true, results }, {}],
            signal => chai.expect(signal.results.total).to.be.eql(1)));
      });

      context('origin cliqz', function () {
        context('total count', function () {
          it('no cliqz results', () =>
            test([
              { hasUserInput: true, results: [mkResult(['navigate-to'])] },
            ], signal => chai.expect(signal.results.origin.cliqz.total).to.eql(0)));

          it('some cliqz selections', () =>
            test([
              { hasUserInput: true, results: [mkResult(['navigate-to'])] },
              { hasUserInput: true, results: [mkResult(['X'])] },
              { hasUserInput: true, results: [mkResult(['m'])] },
              { hasUserInput: true, results: [mkResult(['C'])] },
              { hasUserInput: true, results: [mkResult(['default-search'])] },
            ], signal => chai.expect(signal.results.origin.cliqz.total).to.eql(3)));
        });

        context('source', function () {
          it('empty results', () =>
            test([{ hasUserInput: true, results: [] }],
              signal => chai.expect(signal.results.origin.cliqz.source).to.deep.eql({
                history: 0, backend: 0, mixed: 0
              })));

          it('history results', () =>
            test([{ hasUserInput: true, results: [mkResult(['H'])] }],
              signal => chai.expect(signal.results.origin.cliqz.source).to.deep.eql({
                history: 1, backend: 0, mixed: 0
              })));

          it('backend results', () =>
            test([{ hasUserInput: true, results: [mkResult(['X'])] }],
              signal => chai.expect(signal.results.origin.cliqz.source).to.deep.eql({
                history: 0, backend: 1, mixed: 0
              })));

          it('mixed results', () =>
            test([{ hasUserInput: true, results: [mkResult(['C', 'm'])] }],
              signal => chai.expect(signal.results.origin.cliqz.source).to.deep.eql({
                history: 0, backend: 0, mixed: 1
              })));

          it('multiple results', () =>
            test([
              { hasUserInput: true, results: [mkResult(['X'])] },
              { hasUserInput: true, results: [mkResult(['H'])] },
              { hasUserInput: true, results: [mkResult([])] },
              { hasUserInput: true, results: [mkResult(['C', 'm'])] },
              { hasUserInput: true, results: [mkResult(['m'])] },
            ], signal => chai.expect(signal.results.origin.cliqz.source).to.deep.eql({
              history: 1, backend: 2, mixed: 1
            })));
        });
      });
    });

    context('selections', function () {
      context('total count', function () {
        it('with user input', () =>
          test([{ hasUserInput: true }, { hasUserInput: true }],
            signal => chai.expect(signal.selections.total).to.be.eql(2)));

        it('without user input', () =>
          test([{ hasUserInput: false }, { hasUserInput: false }],
            signal => chai.expect(signal.selections.total).to.be.eql(0)));

        it('with and without user input', () =>
          test([{ hasUserInput: true }, { hasUserInput: false }],
            signal => chai.expect(signal.selections.total).to.be.eql(1)));
      });

      context('index', function () {
        it('single selection', () =>
          test([
            { hasUserInput: true, selection: { index: 0 } },
          ], signal => chai.expect(signal.selections.index).to.deep.eql({
            0: 1,
          })));

        it('multiple selections', () =>
          test([
            { hasUserInput: true, selection: { index: 0 } },
            { hasUserInput: true, selection: { index: 0 } },
            { hasUserInput: true, selection: { index: 1 } },
            { hasUserInput: true, selection: { index: 4 } },
          ], signal => chai.expect(signal.selections.index).to.deep.eql({
            0: 2,
            1: 1,
            4: 1,
          })));

        it('multiple selections with overflow', () =>
          test([
            { hasUserInput: true, selection: { index: 0 } },
            { hasUserInput: true, selection: { index: 15 } },
            { hasUserInput: true, selection: { index: 16 } },
            { hasUserInput: true, selection: { index: 20 } },
          ], signal => chai.expect(signal.selections.index).to.deep.eql({
            0: 1,
            15: 1,
            rest: 2,
          })));
      });

      context('query length', function () {
        it('single selection', () =>
          test([
            { hasUserInput: true, selection: { queryLength: 0 } },
          ], signal => chai.expect(signal.selections.queryLength).to.deep.eql({
            0: 1,
          })));

        it('multiple selections', () =>
          test([
            { hasUserInput: true, selection: { queryLength: 0 } },
            { hasUserInput: true, selection: { queryLength: 0 } },
            { hasUserInput: true, selection: { queryLength: 1 } },
            { hasUserInput: true, selection: { queryLength: 4 } },
          ], signal => chai.expect(signal.selections.queryLength).to.deep.eql({
            0: 2,
            1: 1,
            4: 1,
          })));

        it('multiple selections with overflow', () =>
          test([
            { hasUserInput: true, selection: { queryLength: 0 } },
            { hasUserInput: true, selection: { queryLength: 31 } },
            { hasUserInput: true, selection: { queryLength: 32 } },
            { hasUserInput: true, selection: { queryLength: 128 } },
          ], signal => chai.expect(signal.selections.queryLength).to.deep.eql({
            0: 1,
            31: 1,
            rest: 2,
          })));
      });

      context('origin', function () {
        context('cliqz', function () {
          context('total count', function () {
            it('no cliqz selections', () =>
              test([
                { hasUserInput: true, selection: { origin: 'other' } },
              ], signal => chai.expect(signal.selections.origin.cliqz.total).to.eql(0)));

            it('some cliqz selections', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz' } },
                { hasUserInput: true, selection: { origin: 'other' } },
                { hasUserInput: true, selection: { origin: 'direct' } },
                { hasUserInput: true, selection: { origin: 'cliqz' } },
                { hasUserInput: true, selection: { origin: null } },
              ], signal => chai.expect(signal.selections.origin.cliqz.total).to.eql(2)));
          });

          context('action', function () {
            it('autocomplete', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'enter', isAutocomplete: true } },
                // should never occur
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'click', isAutocomplete: true } },
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'enter', isAutocomplete: false } },
                { hasUserInput: true, selection: { origin: 'other', action: 'enter' } },
              ],
              signal => chai.expect(signal.selections.origin.cliqz.action.autocomplete).to.eql(1)));

            it('click', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'click' } },
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'enter' } },
                { hasUserInput: true, selection: { origin: 'other', action: 'click' } },
              ], signal => chai.expect(signal.selections.origin.cliqz.action.click).to.eql(1)));

            it('enter', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'enter', isAutocomplete: true } },
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'enter', isAutocomplete: false } },
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'click' } },
                { hasUserInput: true, selection: { origin: 'other', action: 'enter' } },
              ], signal => chai.expect(signal.selections.origin.cliqz.action.enter).to.eql(1)));
          });

          context('source', function () {
            it('history', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['H'] } },
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['C'] } },
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['m'] } },
              ], signal => chai.expect(signal.selections.origin.cliqz.source.history).to.eql(2)));

            it('backend', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['m'] } },
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['C'] } },
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['X'] } },
              ], signal => chai.expect(signal.selections.origin.cliqz.source.backend).to.eql(2)));

            it('mixed', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['H'] } },
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['C', 'X'] } },
                { hasUserInput: true, selection: { origin: 'cliqz', sources: ['X'] } },
              ], signal => chai.expect(signal.selections.origin.cliqz.source.mixed).to.eql(1)));
          });
        });

        context('direct', function () {
          context('total count', function () {
            it('no direct selections', () =>
              test([
                { hasUserInput: true, selection: { origin: 'other' } },
              ], signal => chai.expect(signal.selections.origin.direct.total).to.eql(0)));

            it('some direct selections', () =>
              test([
                { hasUserInput: true, selection: { origin: 'direct' } },
                { hasUserInput: true, selection: { origin: 'other' } },
                { hasUserInput: true, selection: { origin: 'cliqz' } },
                { hasUserInput: true, selection: { origin: 'direct' } },
                { hasUserInput: true, selection: { origin: null } },
              ], signal => chai.expect(signal.selections.origin.direct.total).to.eql(2)));
          });

          context('action', function () {
            it('click', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'click' } },
                { hasUserInput: true, selection: { origin: 'direct', action: 'enter' } },
                { hasUserInput: true, selection: { origin: 'direct', action: 'click' } },
              ], signal => chai.expect(signal.selections.origin.direct.action.click).to.eql(1)));

            it('enter', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'enter' } },
                { hasUserInput: true, selection: { origin: 'direct', action: 'click' } },
                { hasUserInput: true, selection: { origin: 'direct', action: 'enter' } },
              ], signal => chai.expect(signal.selections.origin.direct.action.enter).to.eql(1)));
          });
        });

        context('other', function () {
          context('total count', function () {
            it('no other selections', () =>
              test([
                { hasUserInput: true, selection: { origin: 'direct' } },
                { hasUserInput: true, selection: { origin: 'cliqz' } },
              ], signal => chai.expect(signal.selections.origin.other.total).to.eql(0)));

            it('some other selections', () =>
              test([
                { hasUserInput: true, selection: { origin: 'other' } },
                { hasUserInput: true, selection: { origin: 'cliqz' } },
                { hasUserInput: true, selection: { origin: 'direct' } },
                { hasUserInput: true, selection: { origin: 'other' } },
                { hasUserInput: true, selection: { origin: null } },
              ], signal => chai.expect(signal.selections.origin.other.total).to.eql(2)));
          });

          context('action', function () {
            it('click', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'click' } },
                { hasUserInput: true, selection: { origin: 'other', action: 'enter' } },
                { hasUserInput: true, selection: { origin: 'other', action: 'click' } },
              ], signal => chai.expect(signal.selections.origin.other.action.click).to.eql(1)));

            it('enter', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz', action: 'enter' } },
                { hasUserInput: true, selection: { origin: 'other', action: 'click' } },
                { hasUserInput: true, selection: { origin: 'other', action: 'enter' } },
              ], signal => chai.expect(signal.selections.origin.other.action.enter).to.eql(1)));
          });
        });

        context('cliqz', function () {
          context('total count', function () {
            it('some abandoned selections', () =>
              test([
                { hasUserInput: true, selection: { origin: 'cliqz' } },
                { hasUserInput: true, selection: { origin: 'other' } },
                { hasUserInput: true, selection: { origin: 'direct' } },
                { hasUserInput: true, selection: { origin: null } },
                { hasUserInput: true, selection: { origin: null } },
              ], signal => chai.expect(signal.selections.origin.abandoned.total).to.eql(2)));
          });

          context('show time', function () {
            it('multiple selections', () =>
              test([
                { hasUserInput: true, selection: { origin: null, showTime: 1234 } },
                { hasUserInput: true, selection: { origin: null, showTime: 5432 } },
                { hasUserInput: true, selection: { origin: null, showTime: 8765 } },
                { hasUserInput: true, selection: { origin: 'cliqz', showTime: 1234 } },
              ], signal => chai.expect(signal.selections.origin.abandoned.showTime).to.deep.eql({
                1: 1,
                5: 1,
                9: 1,
              })));

            it('multiple selections with overflow', () =>
              test([
                { hasUserInput: true, selection: { origin: null, showTime: 120 } },
                { hasUserInput: true, selection: { origin: null, showTime: 5432 } },
                { hasUserInput: true, selection: { origin: null, showTime: 9499 } },
                { hasUserInput: true, selection: { origin: null, showTime: 9500 } },
              ], signal => chai.expect(signal.selections.origin.abandoned.showTime).to.deep.eql({
                0: 1,
                5: 1,
                9: 1,
                rest: 1,
              })));
          });
        });
      });
    });
  },
});
