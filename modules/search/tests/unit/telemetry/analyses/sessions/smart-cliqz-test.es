/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'search.analysis.sessions.smart-cliqz',
  metrics: ['search.metric.session.interaction'],
  schemas: [
    'search/telemetry/metrics/session/interaction',
    'search/telemetry/analyses/sessions/smart-cliqz',
  ],
  tests: (generateAnalysisResults) => {
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

    context('results', function () {
      context('total count', function () {
        it('empty results', () =>
          test([{ hasUserInput: true, results: [] }],
            signal => chai.expect(signal.results.total).to.be.eql(0)));

        it('some results', () =>
          test([{ hasUserInput: true, results }, { hasUserInput: true, results }],
            signal => chai.expect(signal.results.total).to.be.eql(2)));
      });

      context('class counts', function () {
        it('no SmartCliqz', () =>
          test([{
            hasUserInput: true,
            results: [
              { sources: ['m'] },
            ]
          }],
          signal => chai.expect(signal.results.class).to.deep.eql({})));

        it('no SmartCliqz with class', () =>
          test([{
            hasUserInput: true,
            results: [
              { sources: ['default-search'], classes: ['cliqz'] },
            ]
          }],
          signal => chai.expect(signal.results.class).to.deep.eql({})));

        it('SmartCliqz without class', () =>
          test([{
            hasUserInput: true,
            results: [
              { sources: ['X'] },
            ]
          }],
          signal => chai.expect(signal.results.class).to.deep.eql({})));

        it('single SmartCliqz', () =>
          test([{
            hasUserInput: true,
            results: [
              { sources: ['X'], classes: ['EntityNews'] },
            ]
          }],
          signal => chai.expect(signal.results.class).to.deep.eql({ EntityNews: 1 })));

        it('single SmartCliqz with multiple sources', () =>
          test([{
            hasUserInput: true,
            results: [
              { sources: ['C', 'X'], classes: ['EntityNews'] },
            ]
          }],
          signal => chai.expect(signal.results.class).to.deep.eql({ EntityNews: 1 })));

        it('single SmartCliqz with 2 classes', () =>
          test([{
            hasUserInput: true,
            results: [
              { sources: ['X'], classes: ['EntityNews', 'EntityGeneric'] },
            ]
          }],
          signal => chai.expect(signal.results.class).to.deep.eql({
            EntityNews: 1,
            EntityGeneric: 1,
          })));

        it('2 SmartCliqz of same class', () =>
          test([{
            hasUserInput: true,
            results: [
              { sources: ['X'], classes: ['EntityNews'] },
              { sources: ['X'], classes: ['EntityNews'] },
            ]
          }],
          signal => chai.expect(signal.results.class).to.deep.eql({
            EntityNews: 2,
          })));

        it('2 SmartCliqz of different classes', () =>
          test([{
            hasUserInput: true,
            results: [
              { sources: ['X'], classes: ['EntityNews'] },
              { sources: ['X'], classes: ['EntityGeneric'] },
            ]
          }],
          signal => chai.expect(signal.results.class).to.deep.eql({
            EntityNews: 1,
            EntityGeneric: 1,
          })));

        it('2 SmartCliqz of same class across sessions', () =>
          test([
            {
              hasUserInput: true,
              results: [
                { sources: ['X'], classes: ['EntityNews'] },
              ]
            },
            {
              hasUserInput: true,
              results: [
                { sources: ['X'], classes: ['EntityNews'] },
              ]
            },
          ],
          signal => chai.expect(signal.results.class).to.deep.eql({
            EntityNews: 2,
          })));

        it('2 SmartCliqz of different classes across sessions', () =>
          test([
            {
              hasUserInput: true,
              results: [
                { sources: ['X'], classes: ['EntityNews'] },
              ]
            },
            {
              hasUserInput: true,
              results: [
                { sources: ['X'], classes: ['EntityGeneric'] },
              ]
            },
          ],
          signal => chai.expect(signal.results.class).to.deep.eql({
            EntityNews: 1,
            EntityGeneric: 1,
          })));

        it('various SmartCliqz across sessions', () =>
          test([
            {
              hasUserInput: true,
              results: [
                { sources: ['default-search'], classes: ['cliqz'] },
                { sources: ['X', 'C'], classes: ['EntityNews', 'EntityGeneric'] },
                { sources: ['m'], classes: [] },
                { sources: ['X'], classes: ['EntityWeather'] },
              ]
            },
            {
              hasUserInput: true,
              results: [
                { sources: ['X'], classes: ['EntityGeneric', 'EntityWeather'] },
              ]
            },
            {
              hasUserInput: true,
              results: [
                { sources: ['X', 'm'], classes: ['EntityCurrency'] },
              ]
            },
            {
              hasUserInput: true,
              results: [
                { sources: ['X', 'C'], classes: ['EntityGeneric'] },
              ]
            },
          ],
          signal => chai.expect(signal.results.class).to.deep.eql({
            EntityNews: 1,
            EntityGeneric: 3,
            EntityCurrency: 1,
            EntityWeather: 2,
          })));
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

      context('Cliqz count', function () {
        it('no Cliqz selections', () =>
          test([
            { hasUserInput: true, selection: { origin: 'other' } },
            { hasUserInput: true, selection: { origin: 'direct' } },
          ],
          signal => chai.expect(signal.selections.cliqz).to.be.eql(0)));

        it('some Cliqz selections', () =>
          test([
            { hasUserInput: true, selection: { origin: 'cliqz' } },
            { hasUserInput: true, selection: { origin: 'other' } },
            { hasUserInput: true, selection: { origin: 'cliqz' } },
          ],
          signal => chai.expect(signal.selections.cliqz).to.be.eql(2)));
      });

      context('class counts', function () {
        it('no Cliqz selection', () =>
          test([{
            hasUserInput: true,
            selection: {
              origin: 'direct',
            }
          }],
          signal => chai.expect(signal.selections.class).to.deep.eql({})));

        it('no SmartCliqz selection', () =>
          test([{
            hasUserInput: true,
            selection: {
              origin: 'cliqz',
              sources: ['m'],
              classes: ['other'],
            }
          }],
          signal => chai.expect(signal.selections.class).to.deep.eql({})));

        it('SmartCliqz selection with single class', () =>
          test([{
            hasUserInput: true,
            selection: {
              origin: 'cliqz',
              sources: ['X'],
              classes: ['EntityWeather'],
            }
          }],
          signal => chai.expect(signal.selections.class).to.deep.eql({
            EntityWeather: 1,
          })));

        it('SmartCliqz selection with multiple class', () =>
          test([{
            hasUserInput: true,
            selection: {
              origin: 'cliqz',
              sources: ['X'],
              classes: ['EntityWeather', 'EntityGeneric'],
            }
          }],
          signal => chai.expect(signal.selections.class).to.deep.eql({
            EntityGeneric: 1,
            EntityWeather: 1,
          })));

        it('SmartCliqz selections across sessions', () =>
          test([
            {
              hasUserInput: true,
              selection: {
                origin: 'cliqz',
                sources: ['X'],
                classes: ['EntityWeather'],
              }
            },
            {
              hasUserInput: true,
              selection: {
                origin: 'cliqz',
                sources: ['X'],
                classes: ['EntityNews'],
              }
            },
          ],
          signal => chai.expect(signal.selections.class).to.deep.eql({
            EntityWeather: 1,
            EntityNews: 1,
          })));
      });
    });
  },
});
