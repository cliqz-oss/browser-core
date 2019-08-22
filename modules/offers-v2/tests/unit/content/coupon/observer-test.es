/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
const { JSDOM } = require('jsdom');

export default describeModule('offers-v2/content/coupon/observer',
  () => ({
  }),
  () => {
    describe('coupon observer', function () {
      let CouponFormObserver;

      beforeEach(function () {
        CouponFormObserver = this.module().default;
      });

      context('/send prices', () => {
        let observer;
        let onPricesMock;

        beforeEach(function () {
          const jsdom = new JSDOM('<p><span class="total">11,11</span><span>22.22</span></p>');
          onPricesMock = sinon.mock();
          observer = new CouponFormObserver({
            window: jsdom.window,
            onDescribePrices: onPricesMock,
            offerInfo: { totalSelector: '.total' }
          });
          observer.isCouponFormFound = () => true;
        });

        it('/send prices on document change', () => {
          const add = JSDOM.fragment('<p>content</p>');

          observer._onMutations([{ addedNodes: [add] }]);

          chai.expect(onPricesMock).to.be.called;
          chai.expect(onPricesMock.firstCall.args[0]).to.eql({ total: 11.11 });
        });

        it('/do not send prices if change is not important', () => {
          const script = JSDOM.fragment('<script>console.log("Hello")</script>').firstElementChild;
          const style = JSDOM.fragment('<style>22.22</style>').firstElementChild;
          const iframe = JSDOM.fragment('<iframe><p>inside frame</p></iframe>').firstElementChild;

          observer._onMutations([{ addedNodes: [script, style, iframe] }]);

          chai.expect(onPricesMock).to.be.not.called;
        });
      });
    });
  });
