/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style, no-param-reassign */


const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const beMocks = require('../utils/offers/intent');
const eventsMock = require('../utils/events');
const VALID_OFFER_OBJ = require('../utils/offers/data').VALID_OFFER_OBJ;
const VALID_OOTW_OFFER_OBJ = require('../utils/offers/data').VALID_OOTW_OFFER_OBJ;
const SignalHandlerMock = require('../utils/offers/signals')['offers-v2/signals/signals_handler'].default;
const ehMocks = require('../utils/offers/event_handler')['offers-v2/event_handler'];

const BackendConnectorMock = beMocks['offers-v2/backend-connector'].BackendConnectorMock;
const IntentHandlerMock = beMocks['offers-v2/backend-connector'].IntentHandlerMock;
const HistoryMatcherMock = beMocks['offers-v2/backend-connector'].HistoryMatcherMock;
const CategoryHandlerMock = beMocks['offers-v2/backend-connector'].CategoryHandlerMock;
const EventHandlerMock = ehMocks.default;
const buildUrlData = ehMocks.buildUrlData;

const currentTS = Date.now();
let latestOffersInstalledTs = 0;
const currentDayHour = 0;
const currentWeekDay = 0;
let getDetailsFromUrlReal;
let shouldFilterOfferID = '';

let globalActiveCats = new Set();

const cloneObject = obj => JSON.parse(JSON.stringify(obj));
const cloneOffer = () => cloneObject(VALID_OFFER_OBJ);

const buildOffer = (offerID, campaignID, clientID, displayPriority, filterRules) => {
  const offer = cloneOffer();
  if (offerID) { offer.offer_id = offerID; }
  if (campaignID) { offer.campaign_id = campaignID; }
  if (clientID) { offer.client_id = clientID; }
  if (displayPriority) { offer.displayPriority = displayPriority; }
  if (filterRules) { offer.filterRules = filterRules; }
  return offer;
};

const VALID_4_OFFERS = [
  buildOffer('o1', 'cid1', 'client1', 0.6),
  buildOffer('o2', 'cid1', 'client1', 0.4),
  buildOffer('o3', 'cid2', 'client2', 0.9),
  buildOffer('o4', 'cid3', 'client3', 0.8),
];

// /////////////////////////////////////////////////////////////////////////////
//                              MOCKS
// /////////////////////////////////////////////////////////////////////////////

class FeatureHandlerMock {
  isFeatureAvailable() {
    return false;
  }

  getFeature() {
    return null;
  }
}

export default describeModule('offers-v2/offers/offers-handler',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    ...beMocks,
    ...eventsMock,
    'core/config': {
      default: {
        settings: {
          get channel() {
            return '40'; // chanel defines logic when to show an offer
          },
        },
      },
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/environment': {
      default: {}
    },
    './blacklist': {
      default: class {
        init() {}

        has(url) {
          return url.startsWith('http://global.blacklist');
        }
      }
    },
    './patterns_stat': {
      default: class {
        init() {}

        add() {}
      }
    },
    'offers-v2/utils': {
      timestamp: function () {},
      timestampMS: function () {
        return currentTS;
      },
      dayHour: function () {
        return currentDayHour;
      },
      weekDay: function () {
        return currentWeekDay;
      },
      getABNumber: function () {},
      getLatestOfferInstallTs: function () {
        return latestOffersInstalledTs;
      },
      shouldKeepResource: () => 1,
      isDeveloper: () => true,
    },
    'core/url': {
      getDetailsFromUrl: function (url) {
        // we should extract the name here
        return getDetailsFromUrlReal(url);
      },
    },
    'offers-v2/offers/soft-filter': {
      default: (offer) => {
        return !offer || offer.uniqueID === shouldFilterOfferID;
      }
    },
    'offers-v2/background': {
      default: {
        offersAPI: {
          processRealEstateMessage: () => {}
        }
      },
    },
  }),
  () => {
    describe('/offers-handler', function () {
      let OffersHandler;
      let OfferDB;
      let Offer;
      const events = eventsMock['core/events'].default;
      let ImageDownloaderMod;
      let ImageDownloader;

      beforeEach(async function () {
        persistenceMocks['core/persistence/map'].reset();
        OffersHandler = this.module().default;
        events.clearAll();
        getDetailsFromUrlReal = (await this.system.import('core/url')).getDetailsFromUrl;
        ImageDownloaderMod = await this.system.import('offers-v2/offers/image-downloader');
        ImageDownloader = ImageDownloaderMod.ImageDownloaderForPush;
        Offer = (await this.system.import('offers-v2/offers/offer')).default;
        OfferDB = (await this.system.import('offers-v2/offers/offers-db')).default;
        await ehMocks.init(this.system);
      });

      describe('/offers-handler-test basic test', function () {
        context('/all tests', function () {
          let intentHandlerMock;
          let backendConnectorMock;
          let presentRealEstates;
          let historyMatcherMock;
          let featuresHandlerMock;
          let sigHandlerMock;
          let eventHadlerMock;
          let ohandler;
          let catHandlerMock;
          let offersDB;

          beforeEach(function () {
            globalActiveCats = new Set();

            shouldFilterOfferID = '';

            intentHandlerMock = new IntentHandlerMock();
            backendConnectorMock = new BackendConnectorMock();
            presentRealEstates = new Map();
            historyMatcherMock = new HistoryMatcherMock(/* isHistoryEnabled */ false);
            catHandlerMock = new CategoryHandlerMock();
            sigHandlerMock = new SignalHandlerMock();
            eventHadlerMock = new EventHandlerMock();
            featuresHandlerMock = new FeatureHandlerMock();
            offersDB = new OfferDB();

            presentRealEstates.set('offers-cc', true);

            ohandler = new OffersHandler({
              intentHandler: intentHandlerMock,
              backendConnector: backendConnectorMock,
              presentRealEstates,
              historyMatcher: historyMatcherMock,
              featuresHandler: featuresHandlerMock,
              sigHandler: sigHandlerMock,
              eventHandler: eventHadlerMock,
              categoryHandler: catHandlerMock,
              offersDB: offersDB,
              offersImageDownloader: new ImageDownloader({
                setTimeout: () => {}, // no timeout for `fetch`
              }),
            });

            events.clearAll();
            latestOffersInstalledTs = 0;
          });

          function configureMockData(md) {
            // backend result: intent_name -> [offer1, offer2, ...]
            if (md.backendResult) {
              backendConnectorMock.setMockResult(
                params => md.backendResult[params.intent_name]
              );
            }
          }

          function checkEventPushedForOffer(offerID) {
            const msgs = events.getMessagesForChannel('offers-send-ch');
            chai.expect(msgs).to.be.not.undefined;
            chai.expect(msgs).to.be.not.empty;
            const msg = msgs[0];
            chai.expect(msg.type).eql('push-offer');
            chai.expect(msg.origin).eql('offers-core');
            chai.expect(msg.data.offer_id).eql(offerID);
          }

          function checkOfferPushed(offerID) {
            checkEventPushedForOffer(offerID);
            // TODO: check signal handler here?
          }

          function getPushedOffer(offerID) {
            checkEventPushedForOffer(offerID);
            const msgs = events.getMessagesForChannel('offers-send-ch');
            return msgs[0].data;
          }

          function checkZeroOfferPushed() {
            chai.expect(events.countMsgs('offers-send-ch')).eql(0);
          }

          function waitForBEPromise() {
            return Promise.resolve(true);
          }

          function simulateUrlEventsAndWait(urls) {
            const promises = [];
            urls.forEach((u) => {
              const urlData = buildUrlData(u, null, globalActiveCats);
              const catMatches = urlData.getCategoriesMatchTraits();
              promises.push(ohandler._processEvent({ urlData, catMatches }));
            });
            return Promise.all(promises);
          }

          function setActiveCategoriesFromOffers(offersList) {
            globalActiveCats = new Set();
            offersList.forEach((offer) => {
              if (offer.categories) {
                offer.categories.forEach(c => globalActiveCats.add(c));
              }
            });
          }

          function incOfferActions(offerList, offerAction, count) {
            offerList.forEach((offer) => {
              offersDB.addOfferObject(offer.offer_id, offer);
              offersDB.incOfferAction(offer.offer_id, offerAction, true, count);
            });
          }

          function updateOfferOnDB(ob) {
            if (offersDB.hasOfferData(ob.offer_id)) {
              offersDB.updateOfferObject(ob.offer_id, ob);
            } else {
              offersDB.addOfferObject(ob.offer_id, ob);
            }
          }

          it('/check offers handler exists', function () {
            chai.expect(ohandler).to.exist;
            chai.expect(offersDB).to.exist;
          });

          it('/check one intent activates offers properly', function () {
            const mockData = {
              backendResult: { 'intent-1': [VALID_OFFER_OBJ] },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            return waitForBEPromise().then(() => {
              // wait for the fetch
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers([VALID_OFFER_OBJ]);
              return simulateUrlEventsAndWait(urls).then(() => {
                // check that we could push the
                checkOfferPushed('x');
              });
            });
          });

          it('/check if offer is fresh installed we do not show an offer', function () {
            const mockData = {
              backendResult: { 'intent-1': [VALID_OOTW_OFFER_OBJ] },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // set the latest installed time to the same than current one =>
            // this should produce freshInstalled = true => do not show offers
            latestOffersInstalledTs = currentTS;
            return waitForBEPromise().then(() => {
              // wait for the fetch
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers([VALID_OOTW_OFFER_OBJ]);
              return simulateUrlEventsAndWait(urls).then(() => {
                // check no offer were pushed
                checkZeroOfferPushed();
              });
            });
          });

          it('/check showing 3 times same offer can still be shown', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.9),
              buildOffer('o2', 'cid1', 'client1', 0.8),
              buildOffer('o3', 'cid2', 'client2', 0.7),
              buildOffer('o4', 'cid3', 'client3', 0.6),
            ];

            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers(offersList);
              incOfferActions([offersList[0]], 'offer_dsp_session', 3);
              return simulateUrlEventsAndWait(urls).then(() => {
                // check that we could push the
                checkOfferPushed('o1');
              });
            });
          });

          it('/check showing 3 times 2 offer can still be shown', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.9),
              buildOffer('o2', 'cid1b', 'client1', 0.8),
              buildOffer('o3', 'cid2', 'client2', 0.7),
              buildOffer('o4', 'cid3', 'client3', 0.6),
            ];

            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers(offersList);
              incOfferActions([offersList[0], offersList[1]], 'offer_dsp_session', 3);
              return simulateUrlEventsAndWait(urls).then(() => {
                // check that we could push the
                checkOfferPushed('o1');
              });
            });
          });

          it('/check adding 4 offers will still show another offer', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.9),
              buildOffer('o2', 'cid1b', 'client1', 0.8),
              buildOffer('o3', 'cid2', 'client2', 0.7),
              buildOffer('o4', 'cid3', 'client3', 0.6),
              buildOffer('o5', 'cid4', 'client', 0.6),
              buildOffer('o6', 'cid5', 'client4', 0.6),
            ];

            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers(offersList);
              incOfferActions([offersList[0], offersList[1], offersList[2], offersList[3]], 'offer_dsp_session', 1);
              return simulateUrlEventsAndWait(urls).then(() => {
                checkOfferPushed('o1');
              });
            });
          });

          it('/check adding 5 offers will not show any other offer after', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.9),
              buildOffer('o2', 'cid1', 'client1', 0.8),
              buildOffer('o3', 'cid2', 'client2', 0.7),
              buildOffer('o4', 'cid3', 'client3', 0.6),
              buildOffer('o5', 'cid4', 'client', 0.6),
              buildOffer('o6', 'cid5', 'client4', 0.6),
            ];

            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers(offersList);
              incOfferActions([offersList[0], offersList[1], offersList[2], offersList[3], offersList[4]], 'offer_dsp_session', 1);
              return simulateUrlEventsAndWait(urls).then(() => {
                // check that we could push the
                checkZeroOfferPushed();
              });
            });
          });

          it('/check multiple offers are properly sorted by priority', function () {
            const mockData = {
              backendResult: { 'intent-1': VALID_4_OFFERS },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers(VALID_4_OFFERS);

              return simulateUrlEventsAndWait(urls).then(() => {
                // check that we could push the
                checkOfferPushed('o3');
              });
            });
          });

          it('/check that filtering offers works', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.9),
              buildOffer('o2', 'cid1', 'client1', 0.8),
              buildOffer('o3', 'cid2', 'client2', 0.7),
              buildOffer('o4', 'cid3', 'client3', 0.6),
            ];
            // make o1, o2, o3 invalid since we only have offer-cc
            offersList[0].rs_dest = ['browser-panel'];
            offersList[1].rs_dest = ['browser-panel'];
            offersList[2].rs_dest = ['browser-panel'];
            // offersList[3].rs_dest = [];

            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers(offersList);
              return simulateUrlEventsAndWait(urls).then(() => {
                // check that we could push the
                checkOfferPushed('o4');
              });
            });
          });

          it('/offer is removed after it doesnt match the soft filters and we proceed to the next', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid2', 'client2', 0.9),
            ];
            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers(offersList);
              return simulateUrlEventsAndWait(urls).then(() => {
                // check that we could push the
                checkOfferPushed('o2');
                // sim again and we should show now the o1 offer
                events.clearAll();
                shouldFilterOfferID = 'o2';
                setActiveCategoriesFromOffers(offersList);
                return simulateUrlEventsAndWait(urls).then(() => {
                  // check that we could push the
                  checkOfferPushed('o1');
                });
              });
            });
          });

          function prepareTriggerOffers(offersList) {
            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));
          }

          function triggerOffers(offersList, urls = ['http://www.google.com']) {
            setActiveCategoriesFromOffers(offersList);
            return simulateUrlEventsAndWait(urls);
          }

          // This test actually checks selection by display priority
          it('/if offer of same campaign exists we replace and show that one', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid1', 'client1', 0.9),
            ];
            prepareTriggerOffers(offersList);
            // wait for the fetch
            return waitForBEPromise()
              .then(() => triggerOffers(offersList))
              .then(() => {
                // check that we could push
                checkOfferPushed('o2');
                events.clearAll();

                // we now should get again the same offer since it is stored on the DB
                return triggerOffers(offersList).then(() => {
                  //
                  checkOfferPushed('o2');
                });
              });
          });

          context('/some offer in DB is of the same campaign', () => {
            const campaignId = 'cid';
            const dboffer = buildOffer('oid', campaignId, 'client', 1);

            it('/drop a new offer variant ', () => {
              offersDB.addOfferObject(dboffer.offer_id, dboffer);
              const newCampaignOffer = buildOffer('onew', campaignId, 'client', 1);
              prepareTriggerOffers([newCampaignOffer]);
              return waitForBEPromise()

                .then(() => triggerOffers([newCampaignOffer]))

                .then(() => {
                  const newOfferInDb = offersDB.getOfferObject('onew');
                  chai.expect(newOfferInDb, 'Offer should not be added').is.null;
                });
            });

            it('/inherit ab-info', () => {
              const setAbInfo = function (offer, start, end) {
                offer.abTestInfo = { start, end };
              };
              setAbInfo(dboffer, 0, 10000);
              const offerId = dboffer.offer_id;
              offersDB.addOfferObject(offerId, dboffer);
              const updatingOffer = buildOffer(offerId, campaignId, dboffer.client_id, 1);
              setAbInfo(updatingOffer, -100, -50);
              updatingOffer.ui_info.template_data.desc = 'Updated description';
              updatingOffer.version = 'new-version';
              prepareTriggerOffers([updatingOffer]);
              return waitForBEPromise()

                .then(() => triggerOffers([updatingOffer]))

                .then(() => {
                  const updatedOffer = offersDB.getOfferObject(offerId);
                  chai.expect(updatedOffer.abTestInfo).to.eql({
                    start: 0, end: 10000
                  });
                  chai.expect(updatedOffer.ui_info.template_data.desc)
                    .to.be.equal('Updated description');
                });
            });
          });

          it('/offers that fail when trying to update are discarded', function () {
            const goodOffer = buildOffer('o1', 'cid1', 'client1', 0.9);
            // clone the offer but update the version
            const clonedOffer = cloneObject(goodOffer);
            clonedOffer.version = 'other';
            // NOTE THAT WE NOW SUPPORT MIGRATION OF display id
            clonedOffer.campaign_id = 'wrong-cid-id';

            // add the good offer to the DB
            updateOfferOnDB(goodOffer);

            const mockData = {
              backendResult: { 'intent-1': [clonedOffer] },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.com',
              ];
              setActiveCategoriesFromOffers([clonedOffer]);
              return simulateUrlEventsAndWait(urls).then(() => {
                // we should check no offers were push since its invalid one
                checkZeroOfferPushed();
              });
            });
          });

          it('/blacklist works', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.1),
            ];
            offersList[0].blackListPatterns = ['||google.de'];
            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.google.de',
              ];
              setActiveCategoriesFromOffers(offersList);
              return simulateUrlEventsAndWait(urls).then(() => {
                // none of the offers should be pushed
                checkZeroOfferPushed();

                // now we should push again and with anything except google.de and
                // should work
                urls[0] = 'http://www.amazon.de';
                events.clearAll();
                setActiveCategoriesFromOffers(offersList);
                return simulateUrlEventsAndWait(urls).then(() => {
                  // check that we could push the
                  checkOfferPushed('o1');
                });
              });
            });
          });

          it('/blacklist works and keeps the offer on the list', function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid2', 'client2', 0.2),
            ];
            offersList[0].blackListPatterns = ['||google.de'];
            offersList[1].blackListPatterns = ['||yahoo.de'];
            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            // wait for the fetch
            return waitForBEPromise().then(() => {
              const urls = [
                'http://www.yahoo.de',
              ];
              setActiveCategoriesFromOffers(offersList);
              return simulateUrlEventsAndWait(urls).then(() => {
                checkOfferPushed('o1');

                // now we should push again and with google.de and should work
                urls[0] = 'http://www.amazon.de';
                events.clearAll();
                setActiveCategoriesFromOffers(offersList);
                return simulateUrlEventsAndWait(urls).then(() => {
                  // check that we could push the
                  checkOfferPushed('o2');

                  // now we should push again and with google.de and should work
                  urls[0] = 'http://www.focus.de';
                  events.clearAll();
                  setActiveCategoriesFromOffers(offersList);
                  return simulateUrlEventsAndWait(urls).then(() => {
                    // check that we could push the
                    checkOfferPushed('o2');
                  });
                });
              });
            });
          });

          it('/we can show the same offer multiple times if no filter happens', async function () {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid2', 'client2', 0.9),
            ];
            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);

            // activate intents
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));

            await waitForBEPromise();
            const urls = ['http://www.google.com'];
            setActiveCategoriesFromOffers(offersList);

            // activate offer selection
            await simulateUrlEventsAndWait(urls);
            checkOfferPushed('o2');
            events.clearAll();

            // again (but this time the competing offer wins)
            await simulateUrlEventsAndWait(urls);
            checkOfferPushed('o1');
            events.clearAll();

            // and again (the first offer wins and is shown again)
            await simulateUrlEventsAndWait(urls);
            checkOfferPushed('o2');
          });

          it('/context filters works for offers categories not activated recently', async () => {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid2', 'client2', 0.9),
              buildOffer('o3', 'cid3', 'client3', 1.0),
            ];
            // set cat1, cat2, cat3 respectively
            offersList[0].categories = ['cat1'];
            offersList[1].categories = ['cat2'];
            offersList[2].categories = ['cat3'];
            prepareTriggerOffers(offersList);
            await waitForBEPromise();

            const urls = [
              'http://www.google.com',
            ];
            const activateAndCheck = async (activeCatsOffers, expectedPushedOffer) => {
              setActiveCategoriesFromOffers(activeCatsOffers);
              await simulateUrlEventsAndWait(urls);
              checkOfferPushed(expectedPushedOffer);
              events.clearAll();
            };

            // activate only categories of offer 1 and 2 only
            let activeCatsOffers = [
              offersList[0],
              offersList[1],
            ];
            await activateAndCheck(activeCatsOffers, 'o2');

            // activate now 1 and 3
            activeCatsOffers = [
              offersList[0],
              offersList[2],
            ];
            await activateAndCheck(activeCatsOffers, 'o3');

            // activate now 1 only
            activeCatsOffers = [
              offersList[0],
            ];
            await activateAndCheck(activeCatsOffers, 'o1');
          });

          it('/store how offer was matched', async () => {
            const offer = buildOffer('oid', 'cid', 'client', 1);
            prepareTriggerOffers([offer]);
            await waitForBEPromise();

            await triggerOffers([offer]);

            const r = offersDB.getReasonForHaving(offer.offer_id);
            const expected = [{ pattern: 'SomeMatchPattern',
              domainHash: '1d5920f4b44b27a802bd77c4f0536f5a' }];
            chai.expect(r.getReason()).is.eql(expected);
          });

          it('/check offer of the week is pushed', async () => {
            prepareTriggerOffers([VALID_OOTW_OFFER_OBJ]);
            await waitForBEPromise();

            await triggerOffers([VALID_OOTW_OFFER_OBJ]);

            checkOfferPushed(VALID_OOTW_OFFER_OBJ.offer_id);
          });

          describe('/augment offer with pre-downloaded images, seen by push and offerDB', () => {
            const offer = cloneObject(VALID_OFFER_OBJ);

            beforeEach(() => {
              offer.ui_info.template_data = {
                ...offer.ui_info.template_data,
                logo_url: 'fake://?body=some data&header.content-type=image/smth',
                logo_dataurl: undefined,
                picture_url: 'fake://?body=another data&header.content-type=image/smth',
                picture_dataurl: undefined,
              };
            });

            async function triggerOffer() {
              prepareTriggerOffers([offer]);
              await waitForBEPromise();
              await triggerOffers([offer]);
            }

            function getPushedAndDbOfers() {
              const pushedOffer = new Offer(getPushedOffer(offer.offer_id).offer_data);
              const dbOffer = new Offer(offersDB.getOfferObject(offer.offer_id));
              return [pushedOffer, dbOffer];
            }

            function checkDataurlInOffer(
              expectedLogoDataurl = 'data:image/smth;base64,c29tZSBkYXRh',
              expectedPictureDataurl = 'data:image/smth;base64,YW5vdGhlciBkYXRh'
            ) {
              const [pushedOffer, dbOffer] = getPushedAndDbOfers();
              // offer as pushed
              chai.expect(pushedOffer.getLogoDataurl()).to.eq(expectedLogoDataurl);
              chai.expect(pushedOffer.getPictureDataurl()).to.eq(expectedPictureDataurl);

              // offer in the database
              chai.expect(dbOffer.getLogoDataurl()).to.eq(expectedLogoDataurl);
              chai.expect(dbOffer.getPictureDataurl()).to.eq(expectedPictureDataurl);
            }

            it('/new offer', async () => {
              chai.expect(offersDB.getOfferObject(offer.offer_id)).is.null;

              await triggerOffer();

              checkDataurlInOffer();
            });

            it('/offer already in database', async () => {
              offersDB.addOfferObject(offer.offer_id, offer);

              await triggerOffer();

              checkDataurlInOffer();
            });

            it('/on error, use url for pushed offer, use fallback for db offer', async () => {
              const fakeFailUrl = 'fake://?status=404';
              offer.ui_info.template_data.logo_url = fakeFailUrl;
              offer.ui_info.template_data.picture_url = fakeFailUrl;

              await triggerOffer();

              const [pushedOffer, dbOffer] = getPushedAndDbOfers();
              chai.expect(pushedOffer.getLogoDataurl()).to.eq(fakeFailUrl);
              chai.expect(pushedOffer.getPictureDataurl()).to.eq(fakeFailUrl);
              chai.expect(dbOffer.getLogoDataurl()).to.eq(ImageDownloaderMod.FALLBACK_IMAGE);
              chai.expect(dbOffer.getPictureDataurl()).to.eq(ImageDownloaderMod.FALLBACK_IMAGE);
            });
          });

          it('/send signal for filter-out by competition', async () => {
            sigHandlerMock.clear();
            const offerWinner = buildOffer('oidWinner', 'cid', 'client', 1);
            const offerLoser = buildOffer('oidLoser', 'cid', 'client', 1);
            offerWinner.categories.push('YetAnotherCat');
            prepareTriggerOffers([offerLoser, offerWinner]);

            // Actually triggers the both offers, but without activating
            // the category 'YetAnotherCat' of offerLoser
            await triggerOffers([offerWinner]);

            let sig = sigHandlerMock.getCampaignSignal('cid', 'oidWinner', 'processor', 'filtered_by_compete');
            chai.expect(sig).to.be.undefined;
            sig = sigHandlerMock.getCampaignSignal('cid', 'oidLoser', 'processor', 'filtered_by_compete');
            chai.expect(sig).to.eq(1, 'Loser is filtered out');
          });

          it('/send signals for filter-out by global blacklist', async () => {
            const offer = buildOffer('oid', 'cid', 'client', 1);
            prepareTriggerOffers([offer]);

            await triggerOffers([offer], ['http://global.blacklist.google.de']);

            const sig = sigHandlerMock.getCampaignSignal('cid', 'oid', 'processor', 'filtered_by_global_blacklist');
            chai.expect(sig).to.eq(1, 'Offer is filtered out');
          });

          it('/send signals for filter-out by local blacklist', async () => {
            const offer = buildOffer('oid', 'cid', 'client', 1);
            offer.blackListPatterns = ['||local.blacklist.google.de'];
            prepareTriggerOffers([offer]);

            await triggerOffers([offer], ['http://local.blacklist.google.de']);

            const sig = sigHandlerMock.getCampaignSignal('cid', 'oid', 'processor', 'filtered_by_offer_blacklist');
            chai.expect(sig).to.eq(1, 'Offer is filtered out');
          });
        });
      });
    });
  });
