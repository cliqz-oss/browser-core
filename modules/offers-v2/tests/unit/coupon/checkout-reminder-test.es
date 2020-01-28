/* global describeModule */
/* global chai */

const commonMocks = require('../utils/common');

export default describeModule('offers-v2/coupon/checkout-reminder',
  () => ({
    ...commonMocks,
    'core/LRU': { default: {} },
  }),
  () => {
    let checkoutReminder;
    let store;
    beforeEach(function () {
      const CheckoutReminder = this.module().default;
      store = new Map();
      checkoutReminder = new CheckoutReminder(store);
    });
    afterEach(function () {
      checkoutReminder = null;
      store = null;
    });

    describe('method add', () => {
      it('should add new domain correctly', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain, offerId: 'oid' });
        chai.expect(store.get(domain)[0]).to.not.be.undefined;
        chai.expect(store.get(domain)[1]).to.eq('oid');
      });

      it('should handle existing domain correctly', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain, offerId: 'oid' });
        const model = store.get(domain)[0];
        checkoutReminder.add({ domain, offerId: 'oid' });
        const newModel = store.get(domain)[0];
        chai.expect(model.done).to.equal(newModel.done);
        chai.expect(model.bestPath).to.eql(newModel.bestPath);
      });

      it('should handle existing domain correctly after timeout', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain, offerId: 'oid' });
        const model = store.get(domain)[0];
        model.lastTs -= 60 * 60 * 1000; // hour
        checkoutReminder.add({ domain, offerId: 'oid' });
        const newModel = store.get(domain)[0];
        chai.expect(model).to.not.equal(newModel);
      });
    });

    describe('method receive', () => {
      it('should handle new ev correctly', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain });
        const model = store.get(domain)[0];
        checkoutReminder.receive(domain, 'apply');
        chai.expect(model.getBestPath()).to.eq('apply');
      });
      it('should handle last ev correctly', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain });
        const model = store.get(domain)[0];
        checkoutReminder.receive(domain, 'close');
        chai.expect(model.done).to.be.true;
      });
    });

    describe('method notification', () => {
      it('should handle outdated `updated` correctly', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain });
        const model = store.get(domain)[0];
        model.lastTs -= 60 * 60 * 1000; // hour
        const [ok, view] = checkoutReminder.notification(domain, true);
        chai.expect(ok).to.be.false;
        chai.expect(view).to.be.null;
      });
      it('should return state `checkout`', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain });
        const [ok, view] = checkoutReminder.notification(domain, true);
        chai.expect(ok).to.be.true;
        chai.expect(view).to.be.eq('checkout');
      });
      it('should return state `feedback`', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain });
        checkoutReminder.receive(domain, 'apply');
        const [ok, view] = checkoutReminder.notification(domain, false);
        chai.expect(ok).to.be.true;
        chai.expect(view).to.be.eq('feedback');
      });
      it('should return state `reason`', () => {
        const domain = 'https://hello.world';
        checkoutReminder.add({ domain });
        checkoutReminder.receive(domain, 'apply');
        checkoutReminder.receive(domain, 'fail');
        const [ok, view] = checkoutReminder.notification(domain, false);
        chai.expect(ok).to.be.true;
        chai.expect(view).to.be.eq('reason');
      });
    });
  });
