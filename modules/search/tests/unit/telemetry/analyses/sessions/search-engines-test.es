/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'search.analysis.sessions.search-engines',
  metrics: ['search.metric.session.interaction'],
  schemas: [
    'search/telemetry/metrics/session/interaction',
    'search/telemetry/analyses/sessions/search-engines',
  ],
  tests: (generateAnalysisResults) => {
    const test = async (metrics, check) => {
      const signals = await generateAnalysisResults({
        'search.metric.session.interaction': metrics,
      });
      chai.expect(signals).to.have.length(1);
      check(signals[0]);
    };

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

      context('Other count', function () {
        it('no Cliqz selections', () =>
          test([
            { hasUserInput: true, selection: { origin: 'cliqz' } },
            { hasUserInput: true, selection: { origin: 'direct' } },
          ],
          signal => chai.expect(signal.selections.other).to.be.eql(0)));

        it('some Cliqz selections', () =>
          test([
            { hasUserInput: true, selection: { origin: 'other' } },
            { hasUserInput: true, selection: { origin: 'other' } },
            { hasUserInput: true, selection: { origin: 'cliqz' } },
          ],
          signal => chai.expect(signal.selections.other).to.be.eql(2)));
      });

      context('class counts', function () {
        it('no other selection', () =>
          test([{
            hasUserInput: true,
            selection: {
              origin: 'direct',
            }
          }],
          signal => chai.expect(signal.selections.class).to.deep.eql({})));

        it('other selection without classes', () =>
          test([{
            hasUserInput: true,
            selection: {
              origin: 'other',
              sources: ['default-search'],
            }
          }],
          signal => chai.expect(signal.selections.class).to.deep.eql({})));

        it('other selection with class', () =>
          test([{
            hasUserInput: true,
            selection: {
              origin: 'other',
              sources: ['default-search'],
              classes: ['cliqz'],
            }
          }],
          signal => chai.expect(signal.selections.class).to.deep.eql({
            cliqz: 1,
          })));

        it('other selections across sessions', () =>
          test([
            {
              hasUserInput: true,
              selection: {
                origin: 'other',
                sources: ['default-search'],
                classes: ['cliqz'],
              }
            },
            {
              hasUserInput: true,
              selection: {
                origin: 'other',
                sources: ['default-search'],
                classes: ['google'],
              }
            },
            {
              hasUserInput: true,
              selection: {
                origin: 'other',
                sources: ['default-search'],
                classes: ['cliqz'],
              }
            },
          ],
          signal => chai.expect(signal.selections.class).to.deep.eql({
            cliqz: 2,
            google: 1,
          })));
      });
    });
  },
});
