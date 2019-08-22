/* global describeModule */
/* global chai */

export default describeModule('offers-v2/offers/relation-stats/offers-to-page',
  () => ({
    'core/LRU': { default: {} },
    './offers-to-page-utils': {
      matchHostname: (patterns = []) => patterns[0],
      matchUrl: () => false,
    },
  }),
  () => {
    let relationStats;
    let store;
    beforeEach(function () {
      const RelationStats = this.module().default;
      store = new Map();
      relationStats = new RelationStats(store);
    });
    afterEach(function () {
      relationStats = null;
      store = null;
    });

    describe('method stats', () => {
      it('should return related offers by common triggering rules', () => {
        const url = 'https://hello.world/offers';
        const catMatches = { haveCommonWith: () => true };
        const offer = { offer_id: 'oid1' };
        const offers = [{ offer, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        chai.expect(stats).to.deep.eq({ touched: [], related: ['oid1'] });
      });

      it('should return related offers by site owner', () => {
        const url = 'https://hello.world/offers';
        const catMatches = { haveCommonWith: () => false };
        const monitor = { signalID: 'page_imp', patterns: [true] };
        const offer = { offer_id: 'oid1', monitorData: [monitor] };
        const offers = [{ offer, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        chai.expect(stats).to.deep.eq({ touched: [], related: ['oid1'] });
      });

      it('should return related offers but less then #stored-offers', () => {
        const url = 'https://hello.world/offers';
        const catMatches = { haveCommonWith: () => false };
        const monitor = { signalID: 'page_imp', patterns: [false] };
        const monitor2 = { signalID: 'page_imp', patterns: [true] };
        const offer = { offer_id: 'oid1', monitorData: [monitor] };
        const offer2 = { offer_id: 'oid2', monitorData: [monitor2] };
        const offers = [
          { offer, last_update: Date.now() },
          { offer: offer2, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        chai.expect(stats).to.deep.eq({ touched: [], related: ['oid2'] });
      });

      it('should return touched offers', () => {
        const url = 'https://hello.world/offers';
        const catMatches = { haveCommonWith: () => false };
        const offer = { offer_id: 'oid1' };
        const offerActions = { offer_read: { l_u_ts: Date.now() } };
        const offers = [{ offer, offer_actions: offerActions, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        chai.expect(stats).to.deep.eq({ touched: ['oid1'], related: [] });
      });

      it('should return empty stats', () => {
        const url = 'https://hello.world/offers';
        const catMatches = { haveCommonWith: () => false };
        const offer = { offer_id: 'oid1' };
        const offers = [{ offer, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        chai.expect(stats).to.deep.eq({ touched: [], related: [] });
      });

      it('should return touched offers for `old` related offers', () => {
        const url = 'https://hello.world/offers';
        const catMatches = { haveCommonWith: () => true };
        const lastUpdated = Date.now() - (24 * 60 * 60 * 1000 + 1);
        const offer = { offer_id: 'oid1' };
        const offers = [{ offer, last_update: lastUpdated }];
        const stats = relationStats.stats(offers, catMatches, url);
        chai.expect(stats).to.deep.eq({ touched: ['oid1'], related: ['oid1'] });
      });
    });
  });
