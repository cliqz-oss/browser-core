/* global describeModule */
/* global chai */

const commonMocks = require('./utils/common');

export default describeModule('offers-v2/shop_reminder',
  () => ({
    ...commonMocks,
    'core/LRU': { default: {} },
  }),
  () => {
    let shopReminder;
    let store;
    beforeEach(function () {
      const ShopReminder = this.module().default;
      store = new Map();
      shopReminder = new ShopReminder({ store });
      shopReminder._save = (domain, model) => { store.set(domain, model); };
    });
    afterEach(function () {
      shopReminder = null;
      store = null;
    });

    describe('method add', () => {
      it('should add new domain correctly', () => {
        const domain = 'https://hello.world';
        shopReminder.add(domain);
        chai.expect(store.get(domain).state).to.eq('new');
        chai.expect(store.get(domain).actionsTS).to.deep.eq({});
      });

      it('should handle existing domain correctly', async () => {
        const domain = 'https://hello.world';
        shopReminder.add(domain);
        const model = store.get(domain);
        const sleepOneMs = new Promise(r => setTimeout(r, 1));
        await sleepOneMs;
        shopReminder.add(domain);
        chai.expect(store.get(domain).updated > model.updated).to.be.true;
      });
    });
    describe('method receive', () => {
      it('should handle `updated` correctly', () => {
        const domain = 'https://hello.world';
        shopReminder.add(domain);
        const model = store.get(domain);
        shopReminder.receive(domain, 'open');
        chai.expect(model.state).to.eq('new');
        chai.expect(store.get(domain).state).to.eq('open');
        chai.expect(store.get(domain).updated).to.be.eq(model.updated);
        chai.expect(store.get(domain).actionsTS.open > 0).to.be.true;
      });
      it('should add bonus time', () => {
        const domain = 'https://hello.world';
        shopReminder.add(domain);
        const model = store.get(domain);
        model.updated -= 24 * 60 * 60 * 1000 - 5 * 60 * 1000;
        shopReminder.receive(domain, 'open');
        chai.expect(store.get(domain).updated > model.updated).to.be.true;
      });
    });
    describe('method notification', () => {
      it('should handle outdated `updated` correctly', () => {
        const domain = 'https://hello.world';
        shopReminder.add(domain);
        const model = store.get(domain);
        model.updated -= 25 * 60 * 60 * 1000;
        const [ok, notif] = shopReminder.notification(domain);
        chai.expect(ok).to.be.false;
        chai.expect(notif).to.be.null;
      });
      it('should return notif correctly', () => {
        const domain = 'https://hello.world';
        shopReminder.add(domain);
        const [ok, notif] = shopReminder.notification(domain);
        chai.expect(ok).to.be.true;
        chai.expect(notif.state).to.be.eq('new');
      });
      it('should change state after timestamp', () => {
        const domain = 'https://hello.world';
        shopReminder.add(domain);
        shopReminder.receive(domain, 'close');
        store.get(domain).actionsTS.close -= 46 * 60 * 1000;

        const [ok, notif] = shopReminder.notification(domain);
        chai.expect(ok).to.be.true;
        chai.expect(notif.state).to.be.eq('minimize');
      });
    });
  });
