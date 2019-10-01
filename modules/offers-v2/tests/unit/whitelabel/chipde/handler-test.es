/* global chai */
/* global describeModule */
/* global require */
/* global sinon */

const MockDate = require('mockdate');
const commonMocks = require('../../utils/common');
const persistenceMocks = require('../../utils/persistence');
const fixture = require('../../utils/offers/data');
const waitFor = require('../../utils/waitfor');
const { doRedirects, urls } = require('./redirect');

const config = commonMocks['core/config'].default;

export default describeModule('offers-v2/whitelabel/chipde/handler',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
  }),
  () => {
    describe('chip.de handler', function () {
      context('/integration-style', () => {
        let bg;
        let Category;
        let Intent;

        beforeEach(async function () {
          persistenceMocks.lib.reset();
          bg = (await this.system.import('offers-v2/background')).default;
          Category = (await this.system.import('offers-v2/categories/category')).default;
          Intent = (await this.system.import('offers-v2/intent/intent')).default;
          config.set('OFFERS_BRAND', 'chip');
          await bg.init();
          bg.actions.registerRealEstate({ realEstateID: 'offers-cc' });
        });

        afterEach(async () => {
          await bg.unload();
          MockDate.reset();
          config.reset();
        });

        function activateOffer() {
          const cat = JSON.parse(JSON.stringify(fixture.VALID_CATEGORY));
          cat.patterns.push('||mediamarkt.de$script');
          cat.patterns.push('Beauty$domain=amazon.de,xmlhttprequest');
          const catObj = new Category(
            cat.name,
            cat.patterns,
            cat.version,
            48 * 60 * 60, // timeRangeSecs: 2 days
            cat.activationData
          );
          bg.categoryHandler.addCategory(catObj);
          bg.categoryHandler.build();
          //
          const intent = new Intent('intent1', 48 * 60 * 60);
          bg.offersHandler.intentOffersHandler.setIntentOffers(intent, [fixture.VALID_OFFER_OBJ]);
          bg.intentHandler.activateIntent(intent);
        }

        function followRedirects(chain) {
          doRedirects(chain, bg.chipdeHandler.redirectTagger.onRequest);
        }

        async function assertSignalIsSentAboutFiltering(httpPostMock) {
          await bg.signalsHandler.flush(true /* includeSilent */);
          const sentSignals = httpPostMock.args.map(args => JSON.parse(args[2]));
          chai.expect(sentSignals).to.be.not.empty;
          chai.expect(sentSignals[0].payload.data.c_data.offers).to.be.not.empty;
          const data = sentSignals[0].payload.data.c_data.offers[0].offer_data;
          chai.expect(data).to.eql([{
            origin: 'processor',
            origin_data: { filtered_by_chipde_suspend_list: 1 },
          }]);
        }

        async function visitPageWithOffer(url) {
          const nEvents = bg.offersHandler.nEventsProcessed;
          await bg.eventHandler.onTabLocChanged({ url });
          await waitFor(() => bg.offersHandler.nEventsProcessed > nEvents);
        }

        it('/suspend offers on the target of x.chip.de redirection', async () => {
          //
          // Arrange
          //
          activateOffer();
          const pushMock = sinon.stub(bg.offersAPI, 'pushOffer');
          const httpPostMock = sinon.spy(bg.signalsHandler.sender, 'httpPost');
          followRedirects(urls.defaultChain);

          //
          // Action: visit the page where an offer is possible
          //
          await visitPageWithOffer(urls.target);

          //
          // Assert:
          // - offer is not shown
          // - filter signal is sent
          //
          chai.expect(pushMock).to.be.not.called;
          await assertSignalIsSentAboutFiltering(httpPostMock);
        });

        it('/show offers again after 24 hours', async () => {
          activateOffer();
          const pushMock = sinon.stub(bg.offersAPI, 'pushOffer');
          followRedirects(urls.defaultChain);

          MockDate.set(Date.now() + 24 * 60 * 60 * 1000 + 777);
          await visitPageWithOffer(urls.target);

          chai.expect(pushMock).to.be.called;
        });

        it('/remember suspended sites over browser restart', async () => {
          //
          // Arrange: add an offer that is triggered on the target site
          //
          activateOffer();
          followRedirects(urls.defaultChain);

          //
          // Action 1: restart the browser
          //
          await bg.softUnload();
          await bg.softInit();

          //
          // Arrange: (re-)setup mocks and environment
          //
          const pushMock = sinon.stub(bg.offersAPI, 'pushOffer');
          const httpPostMock = sinon.spy(bg.signalsHandler.sender, 'httpPost');
          activateOffer();

          //
          // Action 2: visit the page where an offer is possible
          //
          await visitPageWithOffer(urls.target);

          //
          // Assert:
          // - offer is not shown
          // - filter signal is sent
          //
          chai.expect(pushMock).to.be.not.called;
          await assertSignalIsSentAboutFiltering(httpPostMock);
        });

        it('/suspend amazon category offers', async () => {
          //
          // Arrange
          //
          activateOffer();
          const pushMock = sinon.stub(bg.offersAPI, 'pushOffer');
          const httpPostMock = sinon.spy(bg.signalsHandler.sender, 'httpPost');
          followRedirects([...urls.defaultChain, 'https://www.amazon.de/some/page']);

          //
          // Action: activate an amazon category offer
          //
          const nEvents = bg.offersHandler.nEventsProcessed;
          await bg.actions.onContentCategories({
            categories: ['Beauty > Make-Up > Gesicht'],
            prefix: 'unit-test',
            url: 'https://www.amazon.de/smth/dp/B07B2Z2ZH1?ref_=Oct_BSellerC_161321031_0...',
          });
          await waitFor(() => bg.offersHandler.nEventsProcessed > nEvents);

          //
          // Assert:
          // - offer is not shown
          // - filter signal is sent
          //
          chai.expect(pushMock).to.be.not.called;
          await assertSignalIsSentAboutFiltering(httpPostMock);
        });
      });
    });
  });
