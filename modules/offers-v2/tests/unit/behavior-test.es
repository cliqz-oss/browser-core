/* global describeModule */
/* global chai */

const commonMocks = require('./utils/common');

const prefs = commonMocks['core/prefs'].default;

export default describeModule('offers-v2/behavior',
  () => ({
    ...commonMocks,
  }),
  () => {
    let behavior;
    beforeEach(async function () {
      const Behavior = this.module().default;
      behavior = new Behavior();
      await behavior.init();
      prefs.set('config_ts', '20180101');
    });

    afterEach(async function () {
      await behavior.clear();
    });

    describe('Test purchase signals', () => {
      it('Stores purchase', async () => {
        await behavior.onPurchase({ domain: 'abcd', price: 10 });
        const count = await behavior.db.purchase.count();
        chai.expect(count).to.be.above(0);
      });

      it('Stores max 4 signals for purchase', async () => {
        await behavior.onPurchase({ domain: 'abcd', price: 10, categories: ['aaa'] });
        const count = await behavior.db.signals.count();
        await behavior.onPurchase({ domain: 'abcd', price: 5, categories: ['bbb'] });
        const newCount = await behavior.db.signals.count();
        chai.expect(newCount - count).to.eql(4);
      });

      it('Remove purchases when expired', async () => {
        prefs.set('config_ts', '20000101');
        await behavior.clear();
        await behavior.onPurchase({ domain: 'abcd', price: 10 });
        prefs.set('config_ts', '20180101');
        await behavior.onPurchase({ domain: 'abcd', price: 10 });
        let count = await behavior.db.purchase.count();
        chai.expect(count).to.be.above(0);
        await behavior.clearOldBehavior();
        count = await behavior.db.purchase.count();
        chai.expect(count).to.eql(1);
        prefs.set('config_ts', '20180601');
        await behavior.clearOldBehavior();
        count = await behavior.db.purchase.count();
        chai.expect(count).to.eql(0);
      });
    });
  });
