/* global chai */
/* global describeModule */

const commonMocks = require('../utils/common');

export default describeModule('offers-v2/common/throttle-with-rejection',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('/Throttle with rejection', function () {
      let ThrottleError;
      let throttle;

      beforeEach(async function () {
        const ThrottleWithRejection = this.module().ThrottleWithRejection;
        ThrottleError = this.module().ThrottleError;
        throttle = new ThrottleWithRejection(120);
      });

      it('/return value of a function', async () => {
        const func = async arg => arg;

        const result = await throttle.executeAsync(func, 777);

        chai.expect(result).is.eq(777);
      });

      it('/reject frequent calls', () => {
        throttle.executeAsync(async () => {});

        chai.expect(
          throttle.executeAsync(async () => {})
        ).to.eventually.throw(ThrottleError);
      });

      it('/track exception-raising calls', () => {
        const raisingFunc = async () => { throw new Error('intended'); };
        // Arrange: call a raising function
        chai.expect(
          throttle.executeAsync(raisingFunc)
        ).to.eventually.throw(Error, 'intended');

        // Act and assert
        chai.expect(
          throttle.executeAsync(raisingFunc)
        ).to.eventually.throw(ThrottleError);
      });
    });
  });
