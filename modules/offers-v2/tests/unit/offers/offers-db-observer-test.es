/* global chai */
/* global describeModule */

const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const VALID_OFFER_OBJ = require('../utils/offers/data').VALID_OFFER_OBJ;

export default describeModule('offers-v2/offers/offers-db-observer',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    'core/timers': {
      setTimeout: () => {},
    },
  }),
  () => {
    describe('/Delete expired offers', function () {
      let odb;
      let isOfferExpired;
      let OfferDBObserver;

      beforeEach(async function () {
        isOfferExpired = this.module().isOfferExpired;
        OfferDBObserver = this.module().default;
        odb = await persistenceMocks.lib.getEmptyOfferDB(this.system, odb);
      });

      function putOfferToDb() {
        const offerObj = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
        odb.addOfferObject(offerObj.offer_id, offerObj);
        const offer = odb.getOffers().filter(
          o => o.offer_id === VALID_OFFER_OBJ.offer_id
        )[0];
        return offer;
      }

      it('/just added offer is not expired', () => {
        const offer = putOfferToDb();

        const isExpired = isOfferExpired(offer);

        chai.expect(isExpired).to.be.false;
      });

      it('/detect offer is expired by offer livetime', () => {
        const offer = putOfferToDb();
        offer.offer.expirationMs = 123456;
        offer.created = Date.now() - 123456 - 1000;

        const isExpired = isOfferExpired(offer);

        chai.expect(isExpired).to.be.true;
      });

      it('/detect offer is expired by campaign expiration', () => {
        const offer = putOfferToDb();
        offer.offer.ui_info.template_data.validity = Date.now() / 1000 - 10000;

        const isExpired = isOfferExpired(offer);

        chai.expect(isExpired).to.be.true;
      });

      it('/delete expired offers on startup', () => {
        const offer = putOfferToDb();
        offer.offer.ui_info.template_data.validity = Date.now() / 1000 - 10000;
        const obs = new OfferDBObserver(odb);

        obs.observeExpirations();

        const offers = odb.getOffers();
        chai.expect(offers).to.be.empty;
      });
    });
  });
