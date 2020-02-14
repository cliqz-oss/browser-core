/* global describeModule */
/* global chai */
const commonMocks = require('../../utils/common');
const { VALID_OFFER_OBJ, VALID_OFFER_SUCCESS_URL } = require('../../utils/offers/data');

const clone = obj => JSON.parse(JSON.stringify(obj));
const getMonitor = (offer, sID) => offer.monitorData.find(({ signalID }) => signalID === sID);
const createHostnamePattern = url => `||${new URL(url).hostname}$script`;

export default describeModule('offers-v2/offers/relation-stats/offers-to-page',
  () => commonMocks,
  () => {
    const urlData = url => ({ getRawUrl: () => url, getPatternRequest: () => [] });
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
        const url = urlData('https://hello.world/offers');
        const catMatches = { haveCommonWith: () => true };
        const offer = { offer_id: 'oid1' };
        const offers = [{ offer, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        const expected = { touched: [], related: ['oid1'], tooltip: [], owned: [] };
        chai.expect(stats).to.deep.eq(expected);
      });

      it('should return related offers by site owner', () => {
        const url = urlData(VALID_OFFER_SUCCESS_URL);
        const offer = clone(VALID_OFFER_OBJ);
        const catMatches = { haveCommonWith: () => false };
        // add a page_imp monitor based on the success monitor
        const monitor = clone(getMonitor(offer, 'success'));
        monitor.signalID = 'page_imp';
        monitor.patterns = [createHostnamePattern(VALID_OFFER_SUCCESS_URL)]; // match host
        offer.monitorData.push(monitor);
        offer.offer_id = 'oid1';
        const offers = [{ offer, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        const expected = { touched: [], related: [], tooltip: [], owned: [offer.offer_id] };
        chai.expect(stats).to.deep.eq(expected);
      });

      it('should return related offers but less then #stored-offers', () => {
        const url = urlData('https://hello.world/offers');
        const catMatches = { haveCommonWith: () => false };
        const offer = clone(VALID_OFFER_OBJ);
        const monitor = clone(getMonitor(offer, 'success'));
        monitor.signalID = 'page_imp';
        monitor.patterns = [createHostnamePattern(VALID_OFFER_SUCCESS_URL)]; // don't match host
        offer.monitorData.unshift(monitor);
        const offer2 = clone(offer);
        offer.offer_id = 'oid1';
        offer2.offer_id = 'oid2';
        const monitor2 = offer2.monitorData[0]; // see unshift above
        monitor2.patterns = [createHostnamePattern(url.getRawUrl())]; // match host
        const offers = [
          { offer, last_update: Date.now() },
          { offer: offer2, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        const expected = { touched: [], related: [], tooltip: [], owned: ['oid2'] };
        chai.expect(stats).to.deep.eq(expected);
      });

      it('should return touched offers', () => {
        const url = urlData('https://hello.world/offers');
        const catMatches = { haveCommonWith: () => false };
        const offer = { offer_id: 'oid1' };
        const offerActions = { offer_read: { l_u_ts: Date.now() } };
        const offers = [{ offer, offer_actions: offerActions, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        const expected = { touched: ['oid1'], related: [], tooltip: [], owned: [] };
        chai.expect(stats).to.deep.eq(expected);
      });

      it('should return tooltip shown offers', () => {
        const url = urlData('https://hello.world/offers');
        const catMatches = { haveCommonWith: () => false };
        const offer = { offer_id: 'oid1' };
        const offerActions = { tooltip_shown: { l_u_ts: Date.now() } };
        const offers = [{ offer, offer_actions: offerActions, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        const expected = { touched: [], related: [], tooltip: ['oid1'], owned: [] };
        chai.expect(stats).to.deep.eq(expected);
      });

      it('should return empty stats', () => {
        const url = urlData('https://hello.world/offers');
        const catMatches = { haveCommonWith: () => false };
        const offer = { offer_id: 'oid1' };
        const offers = [{ offer, last_update: Date.now() }];
        const stats = relationStats.stats(offers, catMatches, url);
        const expected = { touched: [], related: [], tooltip: [], owned: [] };
        chai.expect(stats).to.deep.eq(expected);
      });

      it('should return touched (and tooltip) offers for `old` related offers', () => {
        const url = urlData('https://hello.world/offers');
        const catMatches = { haveCommonWith: () => true };
        const lastUpdated = Date.now() - (24 * 60 * 60 * 1000 + 1);
        const offer = { offer_id: 'oid1' };
        const offers = [{ offer, last_update: lastUpdated }];
        const stats = relationStats.stats(offers, catMatches, url);
        const expected = { touched: ['oid1'], related: ['oid1'], tooltip: ['oid1'], owned: [] };
        chai.expect(stats).to.deep.eq(expected);
      });
    });
  });
