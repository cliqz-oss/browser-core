/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
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
        });

        function extractJourneySignalData(httpPostMock) {
          const sentSignals = httpPostMock.args.map(args => JSON.parse(args[2]));
          const wantSignals = sentSignals.filter(sig => sig.signal_id === 'journey');
          chai.expect(wantSignals.length).to.eql(1, 'signal is sent');
          return wantSignals[0].payload.data;
        }

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
          let url = 'https://some.unclassified.con/aaa';
          await bg.eventHandler.onLocationChangeHandler(url);
          bg.actions.learnTargeting('page-class', { feature: 'c1', url });
          url = 'https://some.unclassified.con/bbb';
          await bg.eventHandler.onLocationChangeHandler(url);
          bg.actions.learnTargeting('page-class', { feature: 'c2', url });
          bg.actions.learnTargeting('action', { feature: 'a', url });

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
          const journeySignal = extractJourneySignalData(httpPostMock);
          chai.expect(journeySignal).to.be.eql({
            type: 'click',
            journey: [['c1'], ['c2', 'a', 'offer_ca_action']],
          });
        });

        it('/send journey on purchase caused by an offer', async () => {
          //
          // Arrange: environment, offer
          //
          const offer = new Offer(fixture.VALID_OFFER_OBJ);
          await bg.offersAPI.pushOffer(offer);

          //
          // Arrange: do journey
          //
          await bg.eventHandler.onLocationChangeHandler('https://smth.unclassified.com/');
          await bg.signalsHandler.setCampaignSignal(
            offer.campaignID, offer.uniqueID, 'unit-test', 'offer_ca_action'
          );
          await bg.signalsHandler.flush();
          const httpPostMock = sinon.spy(bg.signalsHandler.sender, 'httpPost');
          await bg.eventHandler.onLocationChangeHandler(fixture.VALID_OFFER_LANDING_URL);
          await bg.eventHandler.onLocationChangeHandler(fixture.VALID_OFFER_SUCCESS_URL);

          //
          // Assert: signal is sent
          //
          await bg.signalsHandler.flush();
          const journeySignal = extractJourneySignalData(httpPostMock);
          chai.expect(journeySignal).to.be.eql({
            type: 'purchase',
            journey: [['offer_ca_action'], ['landing'], ['success']],
          });
        });

        it('/follow URL rewrite of event handler', async () => {
          const url = 'https://www.google.com/search?client=firefox-b-d&q=laptop+kaufen';
          await bg.eventHandler.onTabLocChanged({ url });

          bg.actions.learnTargeting('page-class', { feature: 'some-f', url });

          const journey = bg.journeyHandler.journeyCollector.getJourney();
          chai.expect(journey).to.eql([['search-top', 'some-f']]);
        });
      });
    });
  });
