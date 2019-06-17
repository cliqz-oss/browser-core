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
  });
