/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
const { EMPTY } = require('rxjs');
const { TestScheduler } = require('rxjs/testing');
const operators = require('rxjs/operators');


const mock = {
  'rxjs/operators': operators,
  'search/logger': {
    default: {
      log() {},
    },
  },
  'search/operators/enricher': {
    default: class {},
  },
  'search/operators/streams/finalize': {
    default: () => observable => observable,
  },
  'search/operators/results/utils': {
    getResultOrder: x => x,
  },
  'search/mixers/mix-results': {
    default: '[dynamic]',
  },
};

export default describeModule('search/mixers/handle-sessions',
  () => mock,
  () => {
    describe('#handleSessions', function () {
      let handleSessions;
      let scheduler;

      beforeEach(function () {
        scheduler = new TestScheduler((actual, expected) => {
          chai.expect(actual).to.deep.equal(expected);
        });
        handleSessions = this.module().default;
      });


      it('start search for each query', function () {
        scheduler.run((helpers) => {
          const { hot, expectObservable, cold } = helpers;
          this.deps('search/mixers/mix-results').default = () => cold('rr|');
          const query$ = hot('-q--q--|');
          const expected = '   -rr-rr-|';
          const messages = handleSessions(query$, EMPTY);
          expectObservable(messages).toBe(expected);
        });
      });

      it('stop updating results on highlight', function () {
        scheduler.run((helpers) => {
          const { hot, expectObservable, cold } = helpers;
          this.deps('search/mixers/mix-results').default = () => cold('rr|');
          const query$ = hot('-q--q--|');
          const highlight$ = hot('-----h-|');
          const expected = '    -rr-r--|';
          const messages = handleSessions(query$, highlight$);
          expectObservable(messages).toBe(expected);
        });
      });
    });
  });
