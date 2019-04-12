/* global chai */
/* global describeModule */
/* global require */
const commonMocks = require('../../utils/common');

export default describeModule('offers-v2/user-journey/features/click-shop',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('user journey classify as click-shop', function () {
      let jcollector;

      beforeEach(async function () {
        const JourneyCollector = (await this.system.import('offers-v2/user-journey/collector')).default;
        jcollector = new JourneyCollector();
      });

      it('/classify the last step', () => {
        const linkerUrl = 'http://some-site-with-links.com/links.html';
        jcollector.addStep({ feature: 'unk', url: linkerUrl });

        jcollector.addStep({ feature: 'unk', url: 'shop.de' });
        jcollector.addFeature({ feature: 'shop', url: 'shop.de', referrer: linkerUrl });

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([['click-shop'], ['shop', 'shop-1']]);
      });

      it('/classify a step in the past', () => {
        const linkerUrl = 'http://some-site-with-links.com/links.html';
        jcollector.addStep({ feature: 'unk', url: linkerUrl });
        jcollector.addStep({ feature: 'unk', url: 'site1.com' });
        jcollector.addStep({ feature: 'unk', url: 'site2.com' });

        jcollector.addStep({ feature: 'unk', url: 'shop.de' });
        jcollector.addFeature({ feature: 'shop', url: 'shop.de', referrer: linkerUrl });

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([['click-shop'], ['unk'], ['unk'], ['shop', 'shop-1']]);
      });

      it('/ignore steps of the same domain as the shop', () => {
        const linkerUrl = 'http://www.shop.de/page.html';
        jcollector.addStep({ feature: 'unk', url: linkerUrl });

        jcollector.addStep({ feature: 'unk', url: 'shop.de' });
        jcollector.addFeature({ feature: 'shop', url: 'shop.de', referrer: linkerUrl });

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([['unk'], ['shop', 'shop-1']]);
      });

      it('/ignore shops without referrer', () => {
        jcollector.addStep({ feature: 'action', url: undefined });

        jcollector.addStep({ feature: 'unk', url: 'shop.de' });
        jcollector.addFeature({ feature: 'shop', url: 'shop.de', referrer: undefined });

        const journey = jcollector.getJourney();
        chai.expect(journey).to.eql([['action'], ['shop', 'shop-1']]);
      });
    });
  });
