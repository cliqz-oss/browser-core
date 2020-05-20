/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */
/* global sinon */

const expect = chai.expect;

export default describeModule('core/decorators',
  () => ({}),
  () => {
    describe('#withTimeout', () => {
      let withTimeout;

      beforeEach(function () {
        withTimeout = this.module().withTimeout;
      });

      it('should succeed with a resolved Promise', async () => {
        expect(await withTimeout(Promise.resolve('PASSED'), 1)).to.equal('PASSED');
      });

      describe('with a fake clock', () => {
        let clock;
        let timer = [];

        function sleep(timeInMs) {
          return new Promise((resolve) => {
            timer.push(setTimeout(resolve, timeInMs));
          });
        }

        beforeEach(function () {
          clock = sinon.useFakeTimers(new Date('2019-01-01'));
        });

        afterEach(function () {
          clock.restore();
          timer.forEach(clearTimeout);
          timer = [];
        });

        it('should pass when resolved before the timeout', async () => {
          const promise = withTimeout(sleep(1000), 2000);
          clock.tick(1000);
          await expect(promise).to.eventually.be.fulfilled;
        });

        it('should fail if the timeout is exceeded', async () => {
          const promise = withTimeout(sleep(2000), 500);
          clock.tick(1000);
          await expect(promise).to.eventually.be.rejected;
        });

        it('should fail if the promise was rejected', async () => {
          const failingPromise = sleep(1000).then(() => { throw new Error('test'); });
          const promise = withTimeout(failingPromise, 2000);
          clock.tick(1000);
          await expect(promise).to.eventually.be.rejected;
        });
      });
    });

    describe('#debounce', () => {
      let target;
      let debounce;
      let debounced;
      let clock;

      beforeEach(function () {
        debounce = this.module().debounce;
        target = sinon.spy();
        debounced = debounce(target, 500);
        clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        target.resetHistory();
        clock.restore();
      });

      it('should be exported', async () => {
        chai.expect(typeof debounce).to.equal('function');
      });

      it('should delay a single call', () => {
        debounced('a', 'b', 'c');
        clock.tick(499);
        chai.expect(target.notCalled).to.be.true;
        clock.tick(1);
        chai.expect(target.calledWith('a', 'b', 'c')).to.be.true;
      });

      it('should debounce sequential calls', () => {
        debounced('first');
        clock.tick(300);
        debounced('second');
        clock.tick(300);
        debounced('third');
        clock.tick(499);
        chai.expect(target.notCalled).to.be.true;
        clock.tick(1);
        chai.expect(target.calledWith('third')).to.be.true;
        clock.tick(2000);
        chai.expect(target.calledOnce).to.be.true;
      });
    });
  });
