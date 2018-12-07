/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/offers/offer',
  () => ({
    ...commonMocks,
  }),
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
    });
  });
