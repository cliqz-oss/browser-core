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
};

export default describeModule('search/operators/streams/static/combine-any-latest',
  () => mock,
  () => {
    describe('#combineAnyLatest', function () {
      let combineAnyLatest;
      let sandbox;

      beforeEach(function () {
        sandbox = rxSandbox.create();
        combineAnyLatest = this.module().default;
      });

      it('does not emit', function () {
        const obs1$ = sandbox.hot(' --');
        const obs2$ = sandbox.hot(' --');
        const expected = sandbox.e('--');

        const messages = sandbox.getMessages(combineAnyLatest([obs1$, obs2$]));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('emits immediately', function () {
        const obs1$ = sandbox.hot(' --1');
        const obs2$ = sandbox.hot(' ---');
        const expected = sandbox.e('--c', { c: ['1'] });

        const messages = sandbox.getMessages(combineAnyLatest([obs1$, obs2$]));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('combines latest', function () {
        const obs1$ = sandbox.hot(' --12-');
        const obs2$ = sandbox.hot(' ----3');
        const expected = sandbox.e('--cde', { c: ['1'], d: ['2'], e: ['2', '3'] });

        const messages = sandbox.getMessages(combineAnyLatest([obs1$, obs2$]));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  });
