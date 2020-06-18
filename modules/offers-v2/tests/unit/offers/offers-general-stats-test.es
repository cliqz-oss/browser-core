/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const VALID_OFFER_OBJ = require('../utils/offers/data').VALID_OFFER_OBJ;
const initializeBackground = require('../utils/offers/integration').initializeBackground;
const cloneObject = require('../utils/utils').cloneObject;

export default describeModule('offers-v2/offers/offers-general-stats',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
  }),
  () => {
    describe('/offer general stats', () => {
      let offersDB;
      let stats; // : OffersGeneralStats

      beforeEach(async function () {
        // Use integration-style testing because the desired functionality
        // is a combination of three components: `OffersGeneralStats`,
        // `OffersDB` and a callback is `OffersHandler`.
        const bg = await initializeBackground(this.system, { cleanupPersistence: true });
        offersDB = bg.offersDB;
        stats = bg.offersHandler.offersGeneralStats;
        chai.expect(stats.offersAddedToday()).to.eq(0);
      });

      it('/calculate number of added offers', async () => {
        const offer = cloneObject(VALID_OFFER_OBJ);

        offersDB.addOfferObject(offer.offer_id, offer);

        chai.expect(stats.offersAddedToday()).to.eq(1);
      });

      it('/exclude dropdown offers from number of added', async () => {
        const offer = cloneObject(VALID_OFFER_OBJ);

        offer.rs_dest = ['dropdown'];
        offersDB.addOfferObject(offer.offer_id, offer);

        chai.expect(stats.offersAddedToday()).to.eq(0);
      });
    });
  });
