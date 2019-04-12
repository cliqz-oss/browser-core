/* global chai */
/* global describeModule */
/* global require */
const commonMocks = require('../../utils/common');

export default describeModule('offers-v2/user-journey/features/shop-id',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('user journey annotate with shop id', function () {
      let jcollector;

      beforeEach(async function () {
        const JourneyCollector = (await this.system.import('offers-v2/user-journey/collector')).default;
        jcollector = new JourneyCollector();
      });

      function visitShop(url) {
        jcollector.addStep({ feature: 'unk', url });
        jcollector.addFeature({ feature: 'shop', url });
      }

      it('/classify and numerate as shop change', () => {
        visitShop('shop1.de');
        visitShop('shop2.de');
        visitShop('shop3.de');
        visitShop('shop4.de');

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([
          ['shop', 'shop-1'],
          ['shop', 'shop-2'],
          ['shop', 'shop-3'],
          ['shop', 'shop-4'],
        ]);
      });

      it('/classify as same shop', () => {
        visitShop('same-shop.de');
        visitShop('same-shop.de');

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([['shop', 'shop-1'], ['shop', 'shop-1']]);
      });

      it('/classify as other shop after non-relevant steps', () => {
        visitShop('shop1.de');
        jcollector.addStep({ feature: 'non-relevant', url: 'somewhere.de' });
        jcollector.addStep({ feature: 'non-relevant', url: 'somewhere.de' });

        visitShop('shop2.de');

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([['shop', 'shop-1'], ['non-relevant'], ['non-relevant'], ['shop', 'shop-2']]);
      });

      it('/classify as same shop after non-relevant steps', () => {
        visitShop('same-shop.de');
        jcollector.addStep({ feature: 'non-relevant', url: 'somewhere.de' });
        jcollector.addStep({ feature: 'non-relevant', url: 'somewhere.de' });

        visitShop('same-shop.de');

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([['shop', 'shop-1'], ['non-relevant'], ['non-relevant'], ['shop', 'shop-1']]);
      });

      it('/re-use IDs that are outside of journey', () => {
        visitShop('shop1.de');
        visitShop('shop2.de');
        visitShop('shop3.de');
        visitShop('shop4.de');
        jcollector.journey.shift();
        jcollector.journey.shift();

        visitShop('shop5.de');
        visitShop('shop6.de');
        visitShop('shop7.de');

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([
          ['shop', 'shop-3'],
          ['shop', 'shop-4'],
          ['shop', 'shop-1'],
          ['shop', 'shop-2'],
          ['shop', 'shop-5'],
        ]);
      });
    });
  });
