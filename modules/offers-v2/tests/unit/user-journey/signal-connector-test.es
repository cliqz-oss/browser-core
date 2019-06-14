/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/user-journey/signal-connector',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('journey signals', function () {
      let collector;
      let JourneySignals;
      let journeySignals;

      beforeEach(async function () {
        const JourneyCollector = (await this.system.import('offers-v2/user-journey/collector')).default;
        collector = new JourneyCollector();
        JourneySignals = this.module().default;
        journeySignals = new JourneySignals(collector);
        await journeySignals.init();
      });

      afterEach(async function () {
        await journeySignals.destroy();
      });

      it('/no signals after creation', async () => {
        const signals = await journeySignals.moveSignals();

        chai.expect(signals).to.be.empty;
      });

      it('/return collected signals', async () => {
        const sampleJourney = [['f1'], ['f2', 'f3'], 'f4'];
        sinon.stub(collector, 'getJourney').returns(sampleJourney);
        await journeySignals.reinterpretCampaignSignalAsync('offer_ca_action');

        const signals = await journeySignals.moveSignals();

        chai.expect(signals).to.eql([{
          type: 'click',
          journey: sampleJourney
        }]);
      });

      it('/empty signals after moving', async () => {
        await journeySignals.reinterpretCampaignSignalAsync('offer_ca_action');

        let signals = await journeySignals.moveSignals();
        chai.expect(signals).to.be.not.empty;

        signals = await journeySignals.moveSignals();
        chai.expect(signals).to.be.empty;
      });

      it('/persist signals', async () => {
        await journeySignals.reinterpretCampaignSignalAsync('offer_ca_action');
        await journeySignals.destroy();

        journeySignals = new JourneySignals(null);
        await journeySignals.init();

        const signals = await journeySignals.moveSignals();
        chai.expect(signals).to.be.not.empty;
      });

      it('/convert monitoring signals to features', async () => {
        collector.addStep({ feature: 'unk', url: 'some-url-1' });
        await journeySignals.reinterpretCampaignSignalAsync('offer_ca_action');
        await journeySignals.moveSignals();
        collector.addStep({ feature: 'unk', url: 'some-url-2' });
        await journeySignals.reinterpretCampaignSignalAsync('cart');
        await journeySignals.reinterpretCampaignSignalAsync('landing');
        await journeySignals.reinterpretCampaignSignalAsync('some-ignored-signal');
        await journeySignals.reinterpretCampaignSignalAsync('page_imp');
        collector.addStep({ feature: 'unk', url: 'some-url-3' });
        await journeySignals.reinterpretCampaignSignalAsync('payment');
        await journeySignals.reinterpretCampaignSignalAsync('success');

        const signals = await journeySignals.moveSignals();

        chai.expect(signals).to.have.length(1);
        chai.expect(signals[0].type).to.eql('purchase');
        chai.expect(signals[0].journey).to.deep.eql([
          ['offer_ca_action'],
          ['cart', 'landing', 'page_imp'],
          ['payment', 'success'],
        ]);
      });
    });
  });
