/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const Rx = require('rxjs');
const operators = require('rxjs/operators');
const rxSandbox = require('rx-sandbox').rxSandbox;
const deepEqual = require('fast-deep-equal');

const mock = {
  rxjs: Rx,
  'rxjs/operators': operators,
  'fast-deep-equal': {
    default: deepEqual,
  },
};

// `a` and `b` have identical urls while `c` is different
const fixtures = {
  a: {
    query: { text: 'a', queryId: 1 },
    responses: [{
      results: [{
        links: [{
          url: 'hello1.com'
        }, {
          url: 'hello2.com'
        }],
      }, {
        links: [{
          url: 'hello3.com'
        }]
      }]
    }],
  },
  b: {
    query: { text: 'b', queryId: 1 },
    responses: [{
      results: [{
        links: [{
          url: 'hello1.com'
        }, {
          url: 'hello2.com'
        }],
      }, {
        links: [{
          url: 'hello3.com'
        }]
      }]
    }],
  },
  c: {
    query: { text: 'c', queryId: 1 },
    responses: [{
      results: [{
        links: [{
          url: 'hello1.com'
        }, {
          url: 'hello2.com'
        }],
      }, {
        links: [{
          url: 'hello4.com'
        }]
      }]
    }],
  },
  d: {
    query: { text: 'd', queryId: 2 },
    responses: [{
      results: [{
        links: [{
          url: 'hello1.com'
        }, {
          url: 'hello2.com'
        }],
      }, {
        links: [{
          url: 'hello4.com'
        }]
      }]
    }],
  }
};

export default describeModule('search/operators/streams/eliminate-repeated-results',
  () => mock,
  () => {
    describe('#eliminateRepeatedResults', function () {
      let eliminateRepeatedResults;
      let sandbox;

      beforeEach(function () {
        sandbox = rxSandbox.create();
        eliminateRepeatedResults = this.module().default;
      });

      it('doesn\'t eliminate different results', function () {
        const source$ = sandbox.hot('-acb', fixtures);
        const expected = sandbox.e(' -acb', fixtures);

        const messages = sandbox.getMessages(source$.pipe(eliminateRepeatedResults()));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('doesn\'t eliminate same results for different queries', function () {
        const source$ = sandbox.hot('-acd', fixtures);
        const expected = sandbox.e(' -acd', fixtures);

        const messages = sandbox.getMessages(source$.pipe(eliminateRepeatedResults()));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('eliminates repeated results', function () {
        const source$ = sandbox.hot('-abbbc', fixtures);
        const expected = sandbox.e(' -a---c', fixtures);

        const messages = sandbox.getMessages(source$.pipe(eliminateRepeatedResults()));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  });
