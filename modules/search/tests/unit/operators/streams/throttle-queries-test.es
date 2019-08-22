/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule, sinon */

const Rx = require('rxjs');
const operators = require('rxjs/operators');
const rxSandbox = require('rx-sandbox').rxSandbox;

// Rx.Observable.interval without mocking does not seem to work with rxSandbox
let intervalMock;

const mock = {
  rxjs: {
    ...Rx,
    interval: i => intervalMock(i),
  },
  'rxjs/operators': operators,
};

export default describeModule('search/operators/streams/throttle-queries',
  () => mock,
  () => {
    describe('#throttleQueries', function () {
      let throttleQueries;
      let sandbox;

      const config = {
        operators: {
          streams: {
            throttleQueries: {
              interval: 99,
            }
          }
        }
      };

      beforeEach(function () {
        sandbox = rxSandbox.create();
        const getThrottleQueries = this.module().default;
        throttleQueries = getThrottleQueries(config);
      });


      it('uses config', function () {
        const signal$ = sandbox.hot('xxx');
        intervalMock = sinon.spy(() => sandbox.hot('-x-'));

        sandbox.getMessages(signal$.pipe(throttleQueries));
        sandbox.flush();

        return chai.expect(intervalMock).to.have.been.calledWith(99);
      });

      it('emits first value', function () {
        const signal$ = sandbox.hot(' -11');
        intervalMock = () => sandbox.hot('---');
        const expected = sandbox.e('  -1-');

        const messages = sandbox.getMessages(signal$.pipe(throttleQueries));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('emits on selector', function () {
        const signal$ = sandbox.hot('-1-234------56--');
        intervalMock = () => sandbox.cold('----x-');
        const expected = sandbox.e('-1---4------5---6');


        const messages = sandbox.getMessages(signal$.pipe(throttleQueries));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  });
