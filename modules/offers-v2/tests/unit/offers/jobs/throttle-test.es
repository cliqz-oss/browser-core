/* global chai */
/* global describeModule */
/* global sinon */

const MockDate = require('mockdate');
const commonMocks = require('../../utils/common');
const persistenceMocks = require('../../utils/persistence');
const fixture = require('../../utils/offers/data');
const {
  activateCategory,
  activateIntentWithOffers,
  initializeBackground,
  getSentSignalForOffer,
  visitPageWithOffer,
} = require('../../utils/offers/integration');
const cloneObject = require('../../utils/utils').cloneObject;

const prefs = commonMocks['core/prefs'].default;

export default describeModule('offers-v2/offers/jobs/throttle',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
  }),
  () => {
    describe('/job/throttle', function () {
      let throttleFilter;
      let Offer;
      let THROTTLE_PER_DOMAIN;

      beforeEach(async function () {
        Offer = (await this.system.import('offers-v2/offers/offer')).default;
        prefs.reset();
        prefs.set('developer', false);
        THROTTLE_PER_DOMAIN = this.module().THROTTLE_PER_DOMAIN;
        const Throttle = this.module().default;
        throttleFilter = new Throttle();
      });

      afterEach(() => {
        prefs.reset();
      });

      function getOfferForRealEstate(dest) {
        const offerObj = cloneObject(fixture.VALID_OFFER_OBJ);
        offerObj.rs_dest = typeof dest === 'string' ? [dest] : dest;
        return new Offer(offerObj);
      }

      function triggerOffer({ dest = ['offers-cc'], matchedDomain = 'something.de' } = {}) {
        const offer = getOfferForRealEstate(dest);
        throttleFilter.onTriggerOffer(offer, matchedDomain);
      }

      it('/throttle in production mode', () => {
        const offerCc = getOfferForRealEstate('offers-cc');
        const offerGh = getOfferForRealEstate('ghostery');

        triggerOffer();
        const offers = throttleFilter.process([offerCc, offerGh, offerCc]);

        chai.expect(offers).to.be.empty;
      });

      it('/do not throttle in development mode', () => {
        prefs.set('developer', true);
        const offerCc = getOfferForRealEstate('offers-cc');
        const offerGh = getOfferForRealEstate('ghostery');

        triggerOffer();
        const offers = throttleFilter.process([offerCc, offerGh, offerCc]);

        chai.expect(offers).to.have.length(3);
      });

      context('/allow after cooldown period', () => {
        afterEach(() => {
          MockDate.reset();
        });
        it('/', () => {
          const offer = getOfferForRealEstate('offers-cc');
          triggerOffer();

          // soon after show: do not show again
          let offers = throttleFilter.process([offer]);
          chai.expect(offers).to.be.empty;

          // after some time: show again
          MockDate.set(Date.now() + 10 * 60 * 1000); // +10 minutes
          offers = throttleFilter.process([offer]);
          chai.expect(offers).to.eql([offer]);
        });
      });

      it('/allow reward box after quick search push', () => {
        const offerCc = getOfferForRealEstate('offers-cc');

        triggerOffer({ dest: ['quick-search', 'smth elase'] });
        const offers = throttleFilter.process([offerCc, offerCc, offerCc]);

        chai.expect(offers).to.have.length(3);
      });

      it('/allow quick search after reward box push', () => {
        const offerCc = getOfferForRealEstate('offers-cc');
        const offerQs1 = getOfferForRealEstate('quick-search');
        const offerQs2 = getOfferForRealEstate('very-quick-search');

        triggerOffer();
        const offers = throttleFilter.process([offerQs1, offerCc, offerQs2]);

        const realEstatesAfterFilter = offers.map(o => o.destinationRealEstates);
        chai.expect(realEstatesAfterFilter).to.eql([['quick-search'], ['very-quick-search']]);
      });

      it('/per-domain throttling: yes for same, no for different domains', () => {
        // switch to per-domain mode
        throttleFilter = new throttleFilter.constructor(THROTTLE_PER_DOMAIN);
        // push on some domain
        const domain = 'something.de';
        triggerOffer({ matchedDomain: domain });
        const offer = getOfferForRealEstate('offers-cc');

        // filter the same domain
        let offers = throttleFilter.process([offer], { urlData: { domain } });
        chai.expect(offers).to.be.empty;

        // do not filter for different domain
        offers = throttleFilter.process([offer], { urlData: { domain: 'another.de' } });
        chai.expect(offers).to.eql([offer]);
      });

      describe('/integration-style', () => {
        let bg;
        let httpPostMock;
        beforeEach(async function () {
          bg = await initializeBackground(this.system);
          httpPostMock = sinon.spy(bg.signalsHandler.sender, 'httpPost');
        });
        it('/throttle', async () => {
          //
          // First pass: offer is pushed
          //
          const offer1 = { ...fixture.VALID_OFFER_OBJ, offer_id: 'pushed', display_id: 'pushed' };
          const url = fixture.VALID_CATEGORY_MATCH_URL1;
          activateCategory(bg, { name: offer1.categories[0] });
          activateIntentWithOffers(bg, 'intent1', [offer1]);
          await visitPageWithOffer(bg, url);

          await bg.signalsHandler.flush(true /* includeSilent */);
          let signal = getSentSignalForOffer('pushed', 'processor', httpPostMock);
          chai.expect(signal).to.have.property('offer_pushed', 1);

          //
          // Second pass: offer is throttled
          //
          const offer2 = {
            ...fixture.VALID_OFFER_OBJ,
            campaign_id: 'filter_out_campaign',
            offer_id: 'filter_out',
            display_id: 'filter_out'
          };
          activateIntentWithOffers(bg, 'intent1', [offer2]);
          await visitPageWithOffer(bg, url);

          await bg.signalsHandler.flush(true /* includeSilent */);
          signal = getSentSignalForOffer('filter_out', 'processor', httpPostMock);
          chai.expect(signal).to.eql({ filtered_by_throttle: 1 });
        });
      });
    });
  });
