/* global chai */
/* global describeModule */
/* global require */
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/user-journey/signal-connector',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('journey signals', function () {
      const sampleJourney = [['f1'], ['f2', 'f3'], 'f4'];
      const collector = {
        getJourney: () => sampleJourney
      };
      let JourneySignals;
      let journeySignals;

      beforeEach(async function () {
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
    });
  });
