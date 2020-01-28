/* global chai */
/* global describeModule */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style, no-param-reassign */


const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const beMocks = require('../utils/offers/intent');
const eventsMock = require('../utils/events');
const { VALID_OFFER_OBJ, VALID_OOTW_OFFER_OBJ } = require('../utils/offers/data');
const SignalHandlerMock = require('../utils/offers/signals')['offers-v2/signals/signals_handler'].default;
const ehMocks = require('../utils/offers/event_handler')['offers-v2/event_handler'];

const BackendConnectorMock = beMocks['offers-v2/backend-connector'].BackendConnectorMock;
const IntentHandlerMock = beMocks['offers-v2/backend-connector'].IntentHandlerMock;
const HistoryMatcherMock = beMocks['offers-v2/backend-connector'].HistoryMatcherMock;
const CategoryHandlerMock = beMocks['offers-v2/backend-connector'].CategoryHandlerMock;
const EventHandlerMock = ehMocks.default;
const buildUrlData = ehMocks.buildUrlData;
const prefs = commonMocks['core/prefs'].default;

const currentTS = Date.now();
let latestOffersInstalledTs = 0;
const currentDayHour = 0;
const currentWeekDay = 0;

let globalActiveCats = new Set();

const cloneObject = obj => JSON.parse(JSON.stringify(obj));
const cloneOffer = (offer = VALID_OFFER_OBJ) => cloneObject(offer);
const tap = fn => function (...args) {
  fn(...args);
  return args[0];
};

const BLACKLIST_URL_PREFIX = 'http://global.blacklist';

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
          return url.startsWith(BLACKLIST_URL_PREFIX);
        }
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
      isDeveloper: () => prefs.get('developer'),
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

          // offer data getters/setters
          const getOfferAbTestInfo = ({ abTestInfo }) => abTestInfo;
          const getOfferClientID = ({ client_id: cid }) => cid;
          const getOfferData = ({ offer_data: offer }) => offer;
          const getOfferID = ({ offer_id: oid }) => oid;
          const getOfferMonitorData = ({ monitorData }) => monitorData;
          const getOfferNotifType = ({ ui_info: { notif_type: nt } }) => nt;
          const getOfferTemplateData = ({ ui_info: { template_data: td } }) => td;
          const getOfferVersion = ({ offer_data: { version } }) => version;
          const getMonitorSignalID = ({ signalID }) => signalID;

          const setOfferAbTestInfo = tap((offer, abTestInfo) => { offer.abTestInfo = abTestInfo; });
          const setOfferBlacklistPatterns = tap(
            (offer, blackListPatterns) => { offer.blackListPatterns = blackListPatterns; }
          );
          const setOfferCampaignID = tap(
            (offer, campaignID) => { offer.campaign_id = campaignID; }
          );
          const setOfferClientID = tap((offer, clientID) => { offer.client_id = clientID; });
          const setOfferDisplayPriority = tap(
            (offer, displayPriority) => { offer.displayPriority = displayPriority; }
          );
          const setOfferFilterRules = tap(
            (offer, filterRules) => { offer.filterRules = filterRules; }
          );
          const setOfferID = tap((offer, offerID) => { offer.offer_id = offerID; });
          const setOfferNotifType = tap(
            (offer, notifType) => { offer.ui_info.notif_type = notifType; }
          );
          const setOfferTriggerOnAdvertiser = tap(
            (offer, triggerOnAdvertiser) => { offer.trigger_on_advertiser = triggerOnAdvertiser; }
          );
          const setOfferVersion = tap((offer, version) => { offer.version = version; });
          const setMonitorSignalID = tap(
            (monitor, signalID) => { monitor.signalID = signalID; }
          );
          const setMonitorPatterns = tap(
            (monitor, patterns) => { monitor.patterns = patterns; }
          );

          const buildOffer = (offerID, campaignID, clientID, displayPriority, filterRules) => {
            const offer = cloneOffer();
            if (offerID) { setOfferID(offer, offerID); }
            if (campaignID) { setOfferCampaignID(offer, campaignID); }
            if (clientID) { setOfferClientID(offer, clientID); }
            if (displayPriority) { setOfferDisplayPriority(offer, displayPriority); }
            if (filterRules) { setOfferFilterRules(offer, filterRules); }
            return offer;
          };

          // predicate factories
          const hasOfferID = offerID => offer => getOfferID(offer) === offerID;
          const hasOfferVersion = version => offer => getOfferVersion(offer) === version;
          const hasMonitorSignalID = signalID =>
            monitor => getMonitorSignalID(monitor) === signalID;

          // queue message getters
          const getMsgType = ({ type }) => type;
          const getMsgOrigin = ({ origin }) => origin;

          const isPushOfferMsgFromOffersCore = msg =>
            getMsgType(msg) === 'push-offer' && getMsgOrigin(msg) === 'offers-core';

          function getPushedOffers() {
            const msgs = events.getMessagesForChannel('offers-send-ch') || [];
            return msgs.filter(isPushOfferMsgFromOffersCore).map(({ data }) => data);
          }

          function expectSinglePushedOffer(offer) {
            const pushedOffers = getPushedOffers();
            chai.expect(pushedOffers.length).to.equal(1);
            const pushedOffer = getOfferData(pushedOffers[0]);
            chai.expect(getOfferID(pushedOffer)).to.equal(getOfferID(offer));
            // assert the offer was not pushed with another notif_type,
            // e.g. red-dot on advertiser or tooltip unread
            chai.expect(getOfferNotifType(pushedOffer)).to.equal(getOfferNotifType(offer));
          }

          function waitForBEPromise() {
            return Promise.resolve(true);
          }

          function simulateUrlEventsAndWait(urls = ['http://www.google.com']) {
            const promises = [];
            urls.forEach((u) => {
              const urlData = buildUrlData(u, null, globalActiveCats);
              const catMatches = urlData.getCategoriesMatchTraits();
              // warning: the internal message queue is currently bypassed
              // because it returns a queue-based Promise,
              // not the event processing Promise
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

          const OFFERS_LIST = [
            buildOffer('o1', 'cid1', 'client1', 0.9),
            buildOffer('o2', 'cid1', 'client1', 0.8),
            buildOffer('o3', 'cid2', 'client2', 0.7),
            buildOffer('o4', 'cid3', 'client3', 0.6),
          ];

          function prepareTriggerOffers(offersList = OFFERS_LIST) {
            const mockData = {
              backendResult: { 'intent-1': offersList },
            };
            configureMockData(mockData);
            const intents = [
              { name: 'intent-1', active: true },
            ];
            intents.forEach(i => intentHandlerMock.activateIntentMock(i));
            return offersList;
          }

          function triggerOffers(offersList, urls = ['http://www.google.com']) {
            setActiveCategoriesFromOffers(offersList);
            return simulateUrlEventsAndWait(urls);
          }

          it('/check offers handler exists', function () {
            chai.expect(ohandler).to.exist;
            chai.expect(offersDB).to.exist;
          });

          it('/check one intent activates offers properly', async () => {
            const offer = cloneOffer();
            const offersList = [offer];
            prepareTriggerOffers(offersList);

            await waitForBEPromise();
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[0]);
          });

          context('/production version', () => {
            const devFlag = prefs.get('developer');
            before(() => {
              prefs.set('developer', false);
            });
            after(() => {
              prefs.set('developer', devFlag);
            });
            it('/check if offer is fresh installed we do not show an offer', async () => {
              const offer = cloneOffer(VALID_OOTW_OFFER_OBJ);
              const offersList = [offer];
              prepareTriggerOffers(offersList);

              // set the latest installed time to the same than current one =>
              // this should produce freshInstalled = true => do not show offers
              latestOffersInstalledTs = currentTS;

              await waitForBEPromise();
              await triggerOffers(offersList);

              chai.expect(getPushedOffers()).to.be.empty;
            });
          });

          it('/check showing 3 times same offer can still be shown', async () => {
            const offersList = prepareTriggerOffers();

            await waitForBEPromise();
            incOfferActions([offersList[0]], 'offer_dsp_session', 3);
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[0]);
          });

          it('/check showing 3 times 2 offer can still be shown', async () => {
            const offersList = prepareTriggerOffers([
              buildOffer('o1', 'cid1', 'client1', 0.9),
              buildOffer('o2', 'cid1b', 'client1', 0.8),
              buildOffer('o3', 'cid2', 'client2', 0.7),
              buildOffer('o4', 'cid3', 'client3', 0.6),
            ]);

            await waitForBEPromise();
            incOfferActions([offersList[0], offersList[1]], 'offer_dsp_session', 3);
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[0]);
          });

          it('/check adding 4 offers will still show another offer', async () => {
            const offersList = prepareTriggerOffers([
              buildOffer('o1', 'cid1', 'client1', 0.9),
              buildOffer('o2', 'cid1b', 'client1', 0.8),
              buildOffer('o3', 'cid2', 'client2', 0.7),
              buildOffer('o4', 'cid3', 'client3', 0.6),
              buildOffer('o5', 'cid4', 'client', 0.6),
              buildOffer('o6', 'cid5', 'client4', 0.6),
            ]);

            await waitForBEPromise();
            incOfferActions([offersList[0], offersList[1], offersList[2], offersList[3]], 'offer_dsp_session', 1);
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[0]);
          });

          it('/check adding 5 offers will not show any other offer after', async () => {
            const offersList = prepareTriggerOffers([
              buildOffer('o1', 'cid1', 'client1', 0.9),
              buildOffer('o2', 'cid1', 'client1', 0.8),
              buildOffer('o3', 'cid2', 'client2', 0.7),
              buildOffer('o4', 'cid3', 'client3', 0.6),
              buildOffer('o5', 'cid4', 'client', 0.6),
              buildOffer('o6', 'cid5', 'client4', 0.6),
            ]);

            await waitForBEPromise();
            incOfferActions([offersList[0], offersList[1], offersList[2], offersList[3], offersList[4]], 'offer_dsp_session', 1);
            await triggerOffers(offersList);

            const o6 = getPushedOffers().find(hasOfferID('o6'));
            chai.expect(o6).to.be.undefined;
          });

          it('/check multiple offers are properly sorted by priority', async () => {
            const offersList = prepareTriggerOffers([
              buildOffer('o1', 'cid1', 'client1', 0.6),
              buildOffer('o2', 'cid1', 'client1', 0.4),
              buildOffer('o3', 'cid2', 'client2', 0.9),
              buildOffer('o4', 'cid3', 'client3', 0.8),
            ]);

            await waitForBEPromise();
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[2]);
          });

          it('/check that filtering offers works', async () => {
            const offersList = cloneObject(OFFERS_LIST);
            // make o1, o2, o3 invalid since we only have offer-cc
            offersList[0].rs_dest = ['browser-panel'];
            offersList[1].rs_dest = ['browser-panel'];
            offersList[2].rs_dest = ['browser-panel'];
            // offersList[3].rs_dest = [];
            prepareTriggerOffers(offersList);

            await waitForBEPromise();
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[3]);
          });

          it('/offer is removed after it doesnt match the soft filters and we proceed to the next', async () => {
            const offersList = prepareTriggerOffers([
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid2', 'client2', 0.9),
            ]);

            await waitForBEPromise();
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[1]);

            // sim again and we should show now the o1 offer
            events.clearAll();

            await simulateUrlEventsAndWait();

            expectSinglePushedOffer(offersList[0]);
          });

          // This test actually checks selection by display priority
          it('/if offer of same campaign exists we replace and show that one', async () => {
            const offersList = prepareTriggerOffers([
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid1', 'client1', 0.9),
            ]);
            await waitForBEPromise();
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[1]);

            events.clearAll();

            // we now should get again the same offer since it is stored on the DB
            await simulateUrlEventsAndWait();

            expectSinglePushedOffer(offersList[1]);
          });

          context('/some offer in DB is of the same campaign', () => {
            const campaignId = 'cid';
            const dboffer = buildOffer('oid', campaignId, 'client', 1);

            it('/drop a new offer variant ', async () => {
              offersDB.addOfferObject(getOfferID(dboffer), dboffer);
              const newCampaignOffer = buildOffer('onew', campaignId, 'client', 1);
              prepareTriggerOffers([newCampaignOffer]);
              await waitForBEPromise();

              await triggerOffers([newCampaignOffer]);

              const newOfferInDb = offersDB.getOfferObject('onew');
              chai.expect(newOfferInDb, 'Offer should not be added').is.null;
            });

            it('/inherit ab-info', async () => {
              setOfferAbTestInfo(dboffer, { start: 0, end: 10000 });
              const offerId = getOfferID(dboffer);
              offersDB.addOfferObject(offerId, dboffer);
              const updatingOffer = buildOffer(offerId, campaignId, getOfferClientID(dboffer), 1);
              setOfferAbTestInfo(updatingOffer, { start: -100, end: -50 });
              getOfferTemplateData(updatingOffer).desc = 'Updated description';
              setOfferVersion(updatingOffer, 'new-version');
              prepareTriggerOffers([updatingOffer]);

              await waitForBEPromise();
              await triggerOffers([updatingOffer]);

              const updatedOffer = offersDB.getOfferObject(offerId);
              chai.expect(getOfferAbTestInfo(updatedOffer)).to.eql({
                start: 0, end: 10000
              });
              chai.expect(getOfferTemplateData(updatedOffer).desc)
                .to.be.equal('Updated description');
            });
          });

          it('/offers that fail when trying to update are discarded', async () => {
            const goodOffer = buildOffer('o1', 'cid1', 'client1', 0.9);
            // clone the offer but update the version
            const badOffer = cloneObject(goodOffer);
            setOfferVersion(badOffer, 'bad');
            // NOTE THAT WE NOW SUPPORT MIGRATION OF display id
            setOfferCampaignID(badOffer, 'wrong-cid-id');

            // add the good offer to the DB
            updateOfferOnDB(goodOffer);

            prepareTriggerOffers([badOffer]);

            await waitForBEPromise();
            await triggerOffers([badOffer]);

            const badVersion = getPushedOffers().find(hasOfferVersion('bad'));
            chai.expect(badVersion).to.be.undefined;
          });

          it('/blacklist works', async () => {
            const offer = buildOffer('o1', 'cid1', 'client1', 0.1);
            const offersList = [offer];
            setOfferBlacklistPatterns(offer, ['||google.de']);
            prepareTriggerOffers(offersList);

            await waitForBEPromise();
            await triggerOffers(offersList, ['http://www.google.de']);

            // none of the offers should be pushed
            chai.expect(getPushedOffers()).to.be.empty;

            // now we should push again and with anything except google.de and should work
            events.clearAll();
            await simulateUrlEventsAndWait(['http://www.amazon.de']);

            expectSinglePushedOffer(offersList[0]);
          });

          it('/blacklist works and keeps the offer on the list', async () => {
            const offersList = [
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid2', 'client2', 0.2),
            ];
            setOfferBlacklistPatterns(offersList[0], ['||google.de']);
            setOfferBlacklistPatterns(offersList[1], ['||yahoo.de']);
            prepareTriggerOffers(offersList);

            await waitForBEPromise();
            await triggerOffers(offersList, ['http://www.yahoo.de']);

            // highest display priority is blacklisted -> lower display priority
            expectSinglePushedOffer(offersList[0]);

            events.clearAll();
            await simulateUrlEventsAndWait(['http://www.amazon.de']);

            // none are blacklisted -> highest display priority
            expectSinglePushedOffer(offersList[1]);

            events.clearAll();
            await simulateUrlEventsAndWait(['http://www.focus.de']);

            expectSinglePushedOffer(offersList[1]);
          });

          it(`/global blacklist filter is overridden on offer's advertiser url and offer is published as "dot" notif_type
when its trigger_on_advertiser property is true and its real estates include "offers-cc"`, async () => {
            const BLACKLIST_ADVERTISER_URL = `${BLACKLIST_URL_PREFIX}.advertiser.com`;

            // create an offer with a trigger_on_advertiser property set to true,
            // a 'popup' notif_type, real estates including 'offers-cc',
            // and a page_imp monitor for the blacklisted url
            const offerID = 'offer-with-trigger-on-advertiser';
            const offer = buildOffer(offerID, 'cid', 'client'); // real estates already include "offers-cc"
            setOfferTriggerOnAdvertiser(offer, true);
            setOfferNotifType(offer, 'popup');
            const monitor = getOfferMonitorData(offer).find(hasMonitorSignalID('success'));
            setMonitorSignalID(monitor, 'page_imp');
            const { hostname } = new URL(BLACKLIST_ADVERTISER_URL);
            setMonitorPatterns(monitor, [`||${hostname}$script`]);

            const offersList = [offer];
            prepareTriggerOffers(offersList);

            await waitForBEPromise();
            await triggerOffers(offersList, [BLACKLIST_ADVERTISER_URL]);

            const pushedOffers = getPushedOffers();
            chai.expect(pushedOffers.length).to.equal(1);
            const pushedOffer = getOfferData(pushedOffers[0]);
            chai.expect(getOfferID(pushedOffer)).to.equal(offerID);
            chai.expect(getOfferNotifType(pushedOffer)).to.equal('dot'); // instead of popup
          });

          it('/we can show the same offer multiple times if no filter happens', async () => {
            const offersList = prepareTriggerOffers([
              buildOffer('o1', 'cid1', 'client1', 0.1),
              buildOffer('o2', 'cid2', 'client2', 0.9),
            ]);

            await waitForBEPromise();
            // activate offer selection
            await triggerOffers(offersList);

            expectSinglePushedOffer(offersList[1]); // highest display priority
            events.clearAll();

            // again (but this time the competing offer wins)
            await simulateUrlEventsAndWait();

            expectSinglePushedOffer(offersList[0]);
            events.clearAll();

            // and again (the first offer wins and is shown again)
            await simulateUrlEventsAndWait();

            expectSinglePushedOffer(offersList[1]);
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

            // activate only categories of offer 1 and 2 only
            await triggerOffers([offersList[0], offersList[1]]);

            expectSinglePushedOffer(offersList[1]); // highest display priority
            events.clearAll();

            // activate now 1 and 3
            await triggerOffers([offersList[0], offersList[2]]);

            expectSinglePushedOffer(offersList[2]); // highest display priority
            events.clearAll();

            // activate now 1 only
            await triggerOffers([offersList[0]]);

            expectSinglePushedOffer(offersList[0]);
          });

          it('/store how offer was matched', async () => {
            const offer = buildOffer('oid', 'cid', 'client', 1);
            const offersList = prepareTriggerOffers([offer]);
            await waitForBEPromise();

            await triggerOffers(offersList);

            const r = offersDB.getReasonForHaving(getOfferID(offer));
            const expected = [{
              pattern: 'SomeMatchPattern',
              domainHash: '1d5920f4b44b27a802bd77c4f0536f5a'
            }];
            chai.expect(r.getReason()).is.eql(expected);
          });

          it('/check offer of the week is pushed', async () => {
            const offer = cloneOffer(VALID_OOTW_OFFER_OBJ);
            const offersList = prepareTriggerOffers([offer]);
            await waitForBEPromise();

            await triggerOffers(offersList);

            expectSinglePushedOffer(offer);
          });

          describe('/augment offer with pre-downloaded images, seen by push and offerDB', () => {
            const offer = cloneObject(VALID_OFFER_OBJ);
            const offerID = getOfferID(offer);
            const offersList = [offer];

            beforeEach(() => {
              offer.ui_info.template_data = {
                ...offer.ui_info.template_data,
                logo_url: 'fake://?body=some data&header.content-type=image/smth',
                logo_dataurl: undefined,
                picture_url: 'fake://?body=another data&header.content-type=image/smth',
                picture_dataurl: undefined,
              };
            });

            function getPushedAndDbOfers() {
              const pushedOffer = getPushedOffers().find(hasOfferID(offerID));
              const dbOffer = offersDB.getOfferObject(offerID);
              return [getOfferData(pushedOffer), dbOffer].map(o => new Offer(o));
            }

            function expectDataurlInOffer(
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

              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList);

              expectDataurlInOffer();
            });

            it('/offer already in database', async () => {
              offersDB.addOfferObject(offer.offer_id, offer);
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList);

              expectDataurlInOffer();
            });

            it('/on error, use url for pushed offer', async () => {
              const fakeFailUrl = 'fake://?status=404';
              const template = getOfferTemplateData(offer);
              template.logo_url = fakeFailUrl;
              template.picture_url = fakeFailUrl;
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList);

              const [pushedOffer] = getPushedAndDbOfers();
              chai.expect(pushedOffer.getLogoDataurl()).to.eq(fakeFailUrl);
              chai.expect(pushedOffer.getPictureDataurl()).to.eq(fakeFailUrl);
            });
          });

          it('/send signal for filter-out by competition', async () => {
            sigHandlerMock.clear();
            const offerWinner = buildOffer('oidWinner', 'cid', 'client', 2);
            const offerLoser = buildOffer('oidLoser', 'cid', 'client', 1);
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
