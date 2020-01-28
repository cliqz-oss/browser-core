/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');
const { VALID_OFFER_OBJ } = require('../utils/offers/data');

export default describeModule('offers-v2/offers/offer',
  () => commonMocks,
  () => {
    describe('/Offer object', function () {
      let Offer;

      beforeEach(function () {
        Offer = this.module().default;
      });

      it('/default reward is 1', () => {
        const offer = new Offer({});

        const reward = offer.getReward();

        chai.expect(reward).to.eql(1);
      });

      it('/use displayPriority as reward', () => {
        const offer = new Offer({ displayPriority: 100 });

        const reward = offer.getReward();

        chai.expect(reward).to.eql(100);
      });

      it('/shouldTriggerOnAdvertiser returns true  when this offer is set to trigger on the advertiser\'s url',
        () => {
          const offerObj = { ...VALID_OFFER_OBJ, trigger_on_advertiser: true };
          const offers = [new Offer(VALID_OFFER_OBJ), new Offer(offerObj)];

          const results = offers.map(offer => offer.shouldTriggerOnAdvertiser());

          chai.expect(results).to.deep.eq([false, true]);
        });
    });
  });
