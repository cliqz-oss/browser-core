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


const mock = {
  rxjs: Rx,
  'rxjs/operators': operators,
  'search/responses': {
    getPendingResponse: () => 'p',
  },
  'search/operators/responses/utils': {
    isDone: r => r === 'd',
    hasResults: r => r === 'r',
  },
};

export default describeModule('search/operators/streams/wait-for-results-from',
  () => mock,
  () => {
    describe('#waitForResultsFrom', function () {
      let waitForResultsFrom;
      let sandbox;

      beforeEach(function () {
        sandbox = rxSandbox.create();
        waitForResultsFrom = this.module().default;
      });

      it('does not emit if other providers do not emit', function () {
        const source$ = sandbox.hot('--');
        const other1$ = sandbox.hot('--');
        const other2$ = sandbox.hot('--');
        const expected = sandbox.e(' --');

        const messages = sandbox.getMessages(source$.pipe(
          waitForResultsFrom([other1$, other2$])
        ));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('emits once all providers are done', function () {
        const source$ = sandbox.hot('-1---');
        const other1$ = sandbox.hot('--d--');
        const other2$ = sandbox.hot('---d-');
        const expected = sandbox.e(' ---1-');

        const messages = sandbox.getMessages(source$.pipe(
          waitForResultsFrom([other1$, other2$])
        ));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('does not emit if there were no results and not all providers are done', function () {
        const source$ = sandbox.hot('-1---');
        const other1$ = sandbox.hot('-----');
        const other2$ = sandbox.hot('---d-');
        const expected = sandbox.e(' -----');

        const messages = sandbox.getMessages(source$.pipe(
          waitForResultsFrom([other1$, other2$])
        ));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('emits starting from first response with results', function () {
        const source$ = sandbox.hot('-1--2');
        const other1$ = sandbox.hot('--r--');
        const other2$ = sandbox.hot('-----');
        const expected = sandbox.e(' --1-2');

        const messages = sandbox.getMessages(source$.pipe(
          waitForResultsFrom([other1$, other2$])
        ));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  });
