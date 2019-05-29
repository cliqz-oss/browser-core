/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
const MockDate = require('mockdate');
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const fixture = require('../utils/offers/data');

export default describeModule('offers-v2/user-journey/journey-handler',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
  }),
  () => {
    describe('journey-handler', function () {
      context('/integration-style', () => {
        let bg;
        let Offer;

        beforeEach(async function () {
          persistenceMocks.lib.reset();
          bg = (await this.system.import('offers-v2/background')).default;
          Offer = (await this.system.import('offers-v2/offers/offer')).default;
          await bg.init();
        });

        afterEach(async () => {
          await bg.unload();
          MockDate.reset();
        });

        it('/send journey to backend on click on offer', async () => {
          //
          // Arrange: environment, offer
          //
          const offer = new Offer(fixture.VALID_OFFER_OBJ);
          await bg.offersAPI.pushOffer(offer);
          await bg.signalsHandler.flush();
          const httpPostMock = sinon.spy(bg.signalsHandler.sender, 'httpPost');

          //
          // Arrange: do journey
          //
          await bg.eventHandler.onLocationChangeHandler('https://some.unclassified.con/aaa');
          MockDate.set(Date.now() + 10000);
          bg.actions.learnTargeting('page-class', 'c1');
          MockDate.set(Date.now() + 10000);
          await bg.eventHandler.onLocationChangeHandler('https://some.unclassified.con/bbb');
          MockDate.set(Date.now() + 10000);
          bg.actions.learnTargeting('page-class', 'c2');
          bg.actions.learnTargeting('action', 'a');
          MockDate.set(Date.now() + 10000);

          //
          // Act: click on an offer
          //
          await bg.signalsHandler.setCampaignSignal(
            offer.campaignID, offer.uniqueID, 'unit-test', 'offer_ca_action'
          );
          await bg.signalsHandler.flush();

          //
          // Assert: signal is sent
          //
          const sentSignals = httpPostMock.args.map(args => JSON.parse(args[2]));
          const wantSignals = sentSignals.filter(sig => sig.signal_id === 'journey');
          chai.expect(wantSignals.length).to.eql(1, 'signal is sent');
          chai.expect(wantSignals[0].payload.data).to.be.eql({
            type: 'click',
            journey: [['unk'], ['c1'], ['unk'], ['c2', 'a']],
          });
        });
      });
    });
  });
