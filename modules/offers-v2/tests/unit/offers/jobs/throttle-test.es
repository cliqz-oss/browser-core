/* global chai */
/* global describeModule */
/* global require */

const commonMocks = require('../../utils/common');
const eventsMocks = require('../../utils/events');
const fixture = require('../../utils/offers/data');

const prefs = commonMocks['core/prefs'].default;
const events = eventsMocks['core/events'].default;

export default describeModule('offers-v2/offers/jobs/throttle',
  () => ({
    ...commonMocks,
    ...eventsMocks,
  }),
  () => {
    describe('/job/throttle', function () {
      let throttleFilter;
      let Offer;

      beforeEach(async function () {
        Offer = (await this.system.import('offers-v2/offers/offer')).default;
        prefs.reset();
        prefs.set('developer', false);
        const Throttle = this.module().default;
        throttleFilter = new Throttle();
        throttleFilter.init();
      });

      afterEach(function () {
        throttleFilter.unload();
      });

      function getOfferForRealEstate(re) {
        const offerObj = JSON.parse(JSON.stringify(fixture.VALID_OFFER_OBJ));
        offerObj['rs_dest'] = [re]; // eslint-disable-line dot-notation
        return new Offer(offerObj);
      }

      it('/throttle in production mode', () => {
        const offerCc = getOfferForRealEstate('offers-cc');
        const offerGh = getOfferForRealEstate('ghostery');

        events.pub('offers-send-ch', { type: 'push-offer', dest: ['offers-cc'], data: 'any' });
        const offers = throttleFilter.process([offerCc, offerGh, offerCc]);

        chai.expect(offers).to.be.empty;
      });

      it('/do not throttle in development mode', () => {
        prefs.set('developer', true);
        const offerCc = getOfferForRealEstate('offers-cc');
        const offerGh = getOfferForRealEstate('ghostery');

        events.pub('offers-send-ch', { type: 'push-offer', dest: ['offers-cc'], data: 'any' });
        const offers = throttleFilter.process([offerCc, offerGh, offerCc]);

        chai.expect(offers).to.have.length(3);
      });

      it('/allow reward box after quick search push', () => {
        const offerCc = getOfferForRealEstate('offers-cc');

        events.pub('offers-send-ch', { type: 'push-offer', dest: ['quick-search', 'smth elase'], data: 'any' });
        const offers = throttleFilter.process([offerCc, offerCc, offerCc]);

        chai.expect(offers).to.have.length(3);
      });

      it('/allow quick search after reward box push', () => {
        const offerCc = getOfferForRealEstate('offers-cc');
        const offerQs1 = getOfferForRealEstate('quick-search');
        const offerQs2 = getOfferForRealEstate('very-quick-search');

        events.pub('offers-send-ch', { type: 'push-offer', dest: ['offers-cc'], data: 'any' });
        const offers = throttleFilter.process([offerQs1, offerCc, offerQs2]);

        const realEstatesAfterFilter = offers.map(o => o.destinationRealEstates);
        chai.expect(realEstatesAfterFilter).to.eql([['quick-search'], ['very-quick-search']]);
      });
    });
  });
