/* global chai */
/* global describeModule */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style, no-param-reassign */


const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const beMocks = require('../utils/offers/intent');
const eventsMock = require('../utils/events');
const { VALID_OFFER_OBJ, VALID_OOTW_OFFER_OBJ } = require('../utils/offers/data');
const cloneObject = require('../utils/utils').cloneObject;
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

let enableOfferCollections = false;
let maxGroupsInOfferCollection = Infinity;

const cloneOffer = (offer = VALID_OFFER_OBJ) => cloneObject(offer);
const tap = fn => function (...args) {
  fn(...args);
  return args[0];
};
const not = fn => (...args) => !fn(...args);
const head = list => list[0];
const tail = list => list.slice(1);

const BLACKLIST_URL_PREFIX = 'http://global.blacklist';
const DYNAMIC_OFFER_CLIENT_ID = 'dynamic-offer-client-id';
const HASH_STRING = 'hash-string';
const AB_NUMBER = 1;

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
          get ENABLE_OFFER_COLLECTIONS() {
            return enableOfferCollections;
          },
          get MAX_GROUPS_IN_OFFER_COLLECTIONS() {
            return maxGroupsInOfferCollection;
          }
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
    './dynamic-offer': {
      getDynamicContent: (offer) => {
        if (offer.clientID === DYNAMIC_OFFER_CLIENT_ID) {
          offer.setDynamicContent('picture-url', 'cta-url');
        }
        return offer;
      },
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
      getABNumber: () => AB_NUMBER,
      getLatestOfferInstallTs: function () {
        return latestOffersInstalledTs;
      },
      shouldKeepResource: () => 1,
      isDeveloper: () => prefs.get('developer'),
      getLocation: () => ({ country: '', city: '' }),
      hashString: () => HASH_STRING
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

      beforeEach(async function () {
        persistenceMocks['core/persistence/map'].reset();
        OffersHandler = this.module().default;
        events.clearAll();
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
            presentRealEstates.set('ghostery', true);

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
            });

            events.clearAll();
            latestOffersInstalledTs = 0;
          });

          // offer data getters/setters
          const getOfferAbTestInfo = ({ abTestInfo }) => abTestInfo;
          const getOfferCampaignID = ({ campaign_id: cid }) => cid;
          const getOfferClientID = ({ client_id: cid }) => cid;
          const getOfferData = ({ offer_data: offer }) => offer;
          const getOfferDisplayID = ({ display_id: did }) => did;
          const getOfferDisplayPriority = ({ displayPriority }) => displayPriority;
          const getOfferID = ({ offer_id: oid }) => oid;
          const getOfferMonitorData = ({ monitorData }) => monitorData;
          const getOfferNotifType = ({ ui_info: { notif_type: nt } }) => nt;
          const getOfferRealEstates = ({ rs_dest: rs }) => rs;
          const getOfferTemplateData = ({ ui_info: { template_data: td } }) => td;
          const getOfferVersion = ({ version }) => version;
          const getMonitorSignalID = ({ signalID }) => signalID;

          const setOfferAbTestInfo = tap((offer, abTestInfo) => { offer.abTestInfo = abTestInfo; });
          const setOfferBlacklistPatterns = tap(
            (offer, blackListPatterns) => { offer.blackListPatterns = blackListPatterns; }
          );
          const setOfferCampaignID = tap(
            (offer, campaignID) => { offer.campaign_id = campaignID; }
          );
          const setOfferClientID = tap((offer, clientID) => { offer.client_id = clientID; });
          const setOfferDisplayID = tap((offer, displayID) => { offer.display_id = displayID; });
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
          const setOfferRealEstates = tap((offer, dest) => { offer.rs_dest = dest; });
          const setMonitorSignalID = tap(
            (monitor, signalID) => { monitor.signalID = signalID; }
          );
          const setMonitorPatterns = tap(
            (monitor, patterns) => { monitor.patterns = patterns; }
          );

          // offer collection getters/setters
          const getOfferCollectionData = ({ offers }) => offers;
          const getOfferFromCollectionEntry = ({ offer_data: offer }) => offer;

          const buildOffer = (offerID, campaignID, clientID, displayPriority, filterRules) => {
            const offer = cloneOffer();
            if (offerID) {
              setOfferID(offer, offerID);
              setOfferDisplayID(offer, `${offerID}_D`);
            }
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

          const OFFERS_LIST = [
            buildOffer('o1', 'cid1', 'client1', 0.9),
            buildOffer('o2', 'cid2', 'client1', 0.8),
            buildOffer('o3', 'cid3', 'client2', 0.7),
            buildOffer('o4', 'cid4', 'client3', 0.6),
          ];

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
              offersDB.incOfferAction(offer.offer_id, offerAction, count);
            });
          }

          function updateOfferOnDB(ob) {
            if (offersDB.hasOfferData(ob.offer_id)) {
              offersDB.updateOfferObject(ob.offer_id, ob);
            } else {
              offersDB.addOfferObject(ob.offer_id, ob);
            }
          }

          describe('/getStoredOffersWithMarkRelevant', () => {
            let filters;
            let url;
            let urlData;
            let catMatches;
            beforeEach(() => {
              filters = { by_rs_dest: 'offers-cc' };
              url = 'http://www.google.com';
              urlData = buildUrlData(url, null, globalActiveCats);
              catMatches = urlData.getCategoriesMatchTraits();
            });

            it(`returns a list of offers wrapped as \`offer_data\` together with
\`relevant\`, \`group\`, \`attrs\` and timestamp properties`, () => {
              const offersList = cloneObject(OFFERS_LIST);

              offersList.forEach(updateOfferOnDB);
              const storedOffers = offersDB.getOffers();

              const result = ohandler.getStoredOffersWithMarkRelevant(
                { filters },
                { catMatches, urlData }
              );

              const getLandingPattern = offer => new Offer(offer).getMonitorPatterns('landing');
              // eslint-disable-next-line camelcase
              const wrapRawOfferFromDB = ({ offer_id, offer, created, last_update }) => ({
                offer_data: offer,
                created_ts: created,
                last_update_ts: last_update,
                attrs: {
                  state: null,
                  isCodeHidden: false,
                  landing: getLandingPattern(offer)
                },
                offer_id,
                relevant: false,
                group: getOfferCampaignID(offer)
              });
              const expected = storedOffers.map(wrapRawOfferFromDB);
              chai.expect(result).to.deep.equal(expected);
            });
          });

          describe('/urlChangedEvent', () => {
            // queue message getters
            const getMsgType = ({ type }) => type;
            const getMsgOrigin = ({ origin }) => origin;

            const isMsgFromOffersCoreOfType = type => msg =>
              getMsgType(msg) === type && getMsgOrigin(msg) === 'offers-core';

            function getMessagesFromOffersChannelOfType(type) {
              const msgs = events.getMessagesForChannel('offers-send-ch') || [];
              return msgs.filter(isMsgFromOffersCoreOfType(type))
                .map(({ data }) => data);
            }

            const getPushedOffers = () => getMessagesFromOffersChannelOfType('push-offer');

            function expectSameOffer(offerA, offerB) {
              chai.expect(getOfferID(offerA), 'incorrect offer_id').to.equal(getOfferID(offerB));
              // assert the offer was not pushed with another notif_type,
              // e.g. red-dot on advertiser or tooltip unread
              chai.expect(getOfferNotifType(offerA), 'incorrect notif_type')
                .to.equal(getOfferNotifType(offerB));
            }

            function expectSinglePushedOffer(offer) {
              const pushedOffers = getPushedOffers().map(getOfferData);
              chai.expect(pushedOffers.length, 'incorrect count of pushed offers').to.equal(1);
              const pushedOffer = pushedOffers[0];
              expectSameOffer(pushedOffer, offer);
            }

            const getPushedOfferCollections = () =>
              getMessagesFromOffersChannelOfType('push-offer-collection');

            function expectSinglePushedOfferCollection(offersList) {
              const pushedOfferCollections = getPushedOfferCollections()
                .map(getOfferCollectionData);
              chai.expect(pushedOfferCollections.length, 'incorrect count of pushed offer collections')
                .to.equal(1);
              const pushedOffersList = pushedOfferCollections[0]
                .map(getOfferFromCollectionEntry);
              chai.expect(pushedOffersList.length, 'incorrect count of offers in collection')
                .to.equal(offersList.length);
              expectSameOffer(head(pushedOffersList), head(offersList));
              for (const offer of tail(offersList)) {
                const offerID = getOfferID(offer);
                const pushedOffer = tail(pushedOffersList).find(hasOfferID(offerID));
                expectSameOffer(pushedOffer, offer);
              }
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

            function configureMockData(md) {
              // backend result: intent_name -> [offer1, offer2, ...]
              if (md.backendResult) {
                backendConnectorMock.setMockResult(
                  params => md.backendResult[params.intent_name]
                );
              }
            }

            function prepareTriggerOffers(offersList = OFFERS_LIST) {
              const mockData = {
                backendResult: { 'intent-1': cloneObject(offersList) },
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
              const offer = cloneOffer();
              const offersList = [offer];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              incOfferActions(offersList, 'offer_dsp_session', 3);
              await triggerOffers(offersList);

              expectSinglePushedOffer(offer);
            });

            it('/check showing 3 times 2 offer can still be shown', async () => {
              const offersList = [
                buildOffer('o1', 'cid1', 'client1', 0.9),
                buildOffer('o2', 'cid1b', 'client1', 0.8),
                buildOffer('o3', 'cid2', 'client2', 0.7),
                buildOffer('o4', 'cid3', 'client3', 0.6),
              ];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              incOfferActions(offersList.slice(0, 2), 'offer_dsp_session', 3);
              await triggerOffers(offersList);

              expectSinglePushedOffer(offersList[0]);
            });

            it('/check adding 4 offers will still show another offer', async () => {
              const offersList = [
                buildOffer('o1', 'cid1', 'client1', 0.9),
                buildOffer('o2', 'cid1b', 'client1', 0.8),
                buildOffer('o3', 'cid2', 'client2', 0.7),
                buildOffer('o4', 'cid3', 'client3', 0.6),
                buildOffer('o5', 'cid4', 'client', 0.6),
                buildOffer('o6', 'cid5', 'client4', 0.6),
              ];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              incOfferActions(offersList.slice(0, 4), 'offer_dsp_session', 1);
              await triggerOffers(offersList);

              expectSinglePushedOffer(offersList[0]);
            });

            it('/check adding 5 offers will not show any other offer after', async () => {
              const offersList = [
                buildOffer('o1', 'cid1', 'client1', 0.9),
                buildOffer('o2', 'cid1', 'client1', 0.8),
                buildOffer('o3', 'cid2', 'client2', 0.7),
                buildOffer('o4', 'cid3', 'client3', 0.6),
                buildOffer('o5', 'cid4', 'client', 0.6),
                buildOffer('o6', 'cid5', 'client4', 0.6),
              ];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              incOfferActions(offersList.slice(0, 4), 'offer_dsp_session', 1);
              await triggerOffers(offersList);

              const o6 = getPushedOffers().map(getOfferData).find(hasOfferID('o6'));
              chai.expect(o6).to.be.undefined;
            });

            it('/check the highest display priority offer will show first', async () => {
              const offersList = [
                buildOffer('o1', 'cid1', 'client1', 0.6),
                buildOffer('o2', 'cid1', 'client1', 0.4),
                buildOffer('o3', 'cid2', 'client2', 0.9),
                buildOffer('o4', 'cid3', 'client3', 0.8),
              ];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList);

              expectSinglePushedOffer(offersList[2]);
            });

            it('/check offers are removed by hard-filter', async () => {
              const offersList = cloneObject(OFFERS_LIST);
              // set unsupported real-estates in first three offers
              offersList.slice(0, 3).forEach(offer => setOfferRealEstates(offer, ['']));

              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList);

              expectSinglePushedOffer(offersList[3]);
            });

            it('/highest priority offer is pushed first', async () => {
              const offersList = [
                buildOffer('o1', 'cid1', 'client1', 0.1),
                buildOffer('o2', 'cid2', 'client2', 0.9),
              ];
              prepareTriggerOffers(offersList);
              await waitForBEPromise();
              await triggerOffers(offersList);

              expectSinglePushedOffer(offersList[1]);

              // sim again and we should show now the o1 offer
              events.clearAll();

              await simulateUrlEventsAndWait();

              expectSinglePushedOffer(offersList[0]);
            });

            it('/if offer of same campaign exists we replace and show that one', async () => {
              const o1 = buildOffer('o1', 'cid1', 'client1', 0.1);
              incOfferActions([o1], 'offer_dsp_session', 1); // o1 previously triggered

              const o2 = buildOffer('o2', 'cid1', 'client1', 0.9); // o2 from same campaign as o1
              const offersList = [o1, o2];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList);

              expectSinglePushedOffer(o1);
            });

            it('/a `silent` offer is triggered when there are no non-silent targeted offers',
              async () => {
                const offersList = cloneObject(OFFERS_LIST);
                offersList.forEach(offer => setOfferNotifType(offer, 'silent'));

                prepareTriggerOffers(offersList);

                await waitForBEPromise();
                await triggerOffers(offersList);

                const pushedOffers = getPushedOffers();
                chai.expect(pushedOffers.length, 'incorrect count of pushed offers').to.equal(1);
              });

            it('/`silent` offers are not triggered when there is at least one non-silent targeted offer',
              async () => {
                const nonSilentOffer = buildOffer('o1', 'cid1', 'client1', 0.1);
                const silentOffer = buildOffer('o-silent', 'cid2', 'client2', 0.9);
                setOfferNotifType(silentOffer, 'silent');
                const offersList = [nonSilentOffer, silentOffer];

                prepareTriggerOffers(offersList);

                await waitForBEPromise();
                await triggerOffers(offersList);

                expectSinglePushedOffer(nonSilentOffer);
              });

            it('/when no targeted offers are relevant, a reminder is pushed if any', async () => {
              const storedOffer = buildOffer('o1', 'cid1', 'client1', 0.9);
              offersDB.addOfferObject(storedOffer.offer_id, storedOffer);
              const offersList = [storedOffer];
              // intent-handler is not set-up so it does not return any relevant offers

              await waitForBEPromise();
              await triggerOffers(offersList);

              const pushedOffers = getPushedOffers();
              chai.expect(pushedOffers.length, 'incorrect count of pushed offers').to.equal(1);
            });

            it('/if any, an `offers-notification:unread-offers-count` is published excluding pushed offers',
              async () => {
                const storedUnreadOffers = [
                  buildOffer('o1', 'cid1', 'client1', 0.9),
                  buildOffer('o2', 'cid2', 'client2', 0.9),
                ];
                for (const unreadOffer of storedUnreadOffers) {
                  offersDB.addOfferObject(unreadOffer.offer_id, unreadOffer);
                }
                const offersList = [storedUnreadOffers[0]];
                prepareTriggerOffers(offersList);
                await waitForBEPromise();

                await triggerOffers(offersList);
                const msgs = events.getMessagesForChannel('offers-notification:unread-offers-count') || [];
                chai.expect(msgs.length, 'unread-offers-count notification count').to.equal(1);
                chai.expect(msgs[0]?.count, 'unread offer count').to.equal(1);
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

            it('/offers with a `display_id` from another already stored offer are ignored', async () => {
              const displayID = 'portal-offer-id';
              const storedOffer = buildOffer('stored-offer', 'cid1-1', 'client', 0.1);
              const samePortalOfferAsStoredOffer = buildOffer('from-same-portal-offer', 'cid1-2', 'client', 0.1);
              setOfferDisplayID(storedOffer, displayID);
              setOfferDisplayID(samePortalOfferAsStoredOffer, displayID);
              incOfferActions([storedOffer], 'offer_dsp_session', 1);
              const offersList = [
                samePortalOfferAsStoredOffer,
                buildOffer('o2', 'cid2', 'client1', 0.8),
                buildOffer('o3', 'cid3', 'client2', 0.7)
              ];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList);

              const pushedOffers = getPushedOffers().map(getOfferData);
              chai.expect(pushedOffers.length).to.equal(1);
              const ignored = pushedOffers.find(hasOfferID('from-same-portal-offer'));
              chai.expect(ignored).to.be.undefined;
            });

            it('/display action meta is migrated', async () => {
              const offerID = 'stored-offer';
              const displayID = `${offerID}_D`;
              const storedOffer = buildOffer(offerID, 'cid', 'client', 0.9);
              setOfferDisplayID(storedOffer, displayID);
              incOfferActions([storedOffer], 'offer_dsp_session', 1);
              const storedDisplayActionMeta = offersDB
                .getOfferDisplayActionMeta(displayID, 'offer_dsp_session');

              prepareTriggerOffers([storedOffer]);

              await waitForBEPromise();
              await triggerOffers([storedOffer]);

              const pushedOffers = getPushedOffers().map(getOfferData);
              chai.expect(pushedOffers.length).to.equal(1);
              const pushedOffer = head(pushedOffers);
              const pushedDisplayID = getOfferDisplayID(pushedOffer);
              chai.expect(pushedDisplayID).not.to.equal(displayID);
              chai.expect(offersDB.getOfferDisplayActionMeta(pushedDisplayID, 'offer_dsp_session'))
                .to.deep.equal(storedDisplayActionMeta);
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

              const badVersion = getPushedOffers().map(getOfferData).find(hasOfferVersion('bad'));
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

            it(`/blacklist filters are overridden on offer's advertiser url and offer is published
as "dot" notif_type when its trigger_on_advertiser property is true
and its real estates include "offers-cc"`, async () => {
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
              setOfferBlacklistPatterns(offer, [`||${hostname}`]);

              const offersList = [offer];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList, [BLACKLIST_ADVERTISER_URL]);

              const pushedOffers = getPushedOffers().map(getOfferData);
              chai.expect(pushedOffers.length).to.equal(1);
              const pushedOffer = pushedOffers[0];
              chai.expect(getOfferID(pushedOffer)).to.equal(offerID);
              chai.expect(getOfferNotifType(pushedOffer)).to.equal('dot'); // instead of popup
            });

            it(`/blacklist filters are overridden on offer's advertiser url and offer is published
as defined by its trigger_on_advertiser property when either 'dot' or 'tooltip'
and its real estates include "offers-cc"`, async () => {
              const BLACKLIST_ADVERTISER_URL = `${BLACKLIST_URL_PREFIX}.advertiser.com`;

              // create an offer with a trigger_on_advertiser property set to true,
              // a 'popup' notif_type, real estates including 'offers-cc',
              // and a page_imp monitor for the blacklisted url
              const offerID = 'offer-with-trigger-on-advertiser';
              const offer = buildOffer(offerID, 'cid', 'client'); // real estates already include "offers-cc"
              setOfferTriggerOnAdvertiser(offer, 'tooltip');
              setOfferNotifType(offer, 'popup');
              const monitor = getOfferMonitorData(offer).find(hasMonitorSignalID('success'));
              setMonitorSignalID(monitor, 'page_imp');
              const { hostname } = new URL(BLACKLIST_ADVERTISER_URL);
              setMonitorPatterns(monitor, [`||${hostname}$script`]);
              setOfferBlacklistPatterns(offer, [`||${hostname}`]);

              const offersList = [offer];
              prepareTriggerOffers(offersList);

              await waitForBEPromise();
              await triggerOffers(offersList, [BLACKLIST_ADVERTISER_URL]);

              const pushedOffers = getPushedOffers().map(getOfferData);
              chai.expect(pushedOffers.length).to.equal(1);
              const pushedOffer = pushedOffers[0];
              chai.expect(getOfferID(pushedOffer)).to.equal(offerID);
              chai.expect(getOfferNotifType(pushedOffer)).to.equal('tooltip'); // instead of popup
            });

            it('/we can show the same offer multiple times if no filter happens', async () => {
              const offersList = [
                buildOffer('o1', 'cid1', 'client1', 0.1),
                buildOffer('o2', 'cid2', 'client2', 0.9),
              ];
              prepareTriggerOffers(offersList);

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

            it('/send signal for filter-out by competition', async () => {
              sigHandlerMock.clear();
              const offerWinner = buildOffer('oidWinner', 'cidW', 'client', 2);
              const offerLoser = buildOffer('oidLoser', 'cidL', 'client', 1);
              const offersList = [offerLoser, offerWinner];
              prepareTriggerOffers(offersList);

              await triggerOffers([offerWinner]);

              let sig = sigHandlerMock.getCampaignSignal('cidW', 'oidWinner', 'processor', 'filtered_by_compete');
              chai.expect(sig).to.be.undefined;
              sig = sigHandlerMock.getCampaignSignal('cidL', 'oidLoser', 'processor', 'filtered_by_compete');
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

            describe('/when ENABLE_OFFER_COLLECTION global config setting is true', () => {
              beforeEach(function () {
                enableOfferCollections = true;
              });
              afterEach(function () {
                enableOfferCollections = false;
              });
              it(`/when multiple offers are relevant but the best offer
does not include the "offers-cc" real-estate, the best offer is selected and pushed individually`,
              async () => {
                const bestOffer = buildOffer('o1', 'cid1', 'client1', 0.9);
                const offersList = [
                  bestOffer,
                  buildOffer('o2', 'cid1', 'client1', 0.8),
                  buildOffer('o3', 'cid2', 'client2', 0.7)
                ];
                const estates = getOfferRealEstates(bestOffer);
                estates.length = 0;
                estates.push('ghostery');
                prepareTriggerOffers(offersList);

                await waitForBEPromise();
                await triggerOffers(offersList);

                expectSinglePushedOffer(bestOffer);
              });

              it('/`silent` offers are not pushed when there are no non-silent targeted offers', async () => {
                const silentOffersList = [
                  buildOffer('o1', 'cid1', 'client1', 0.2),
                  buildOffer('o2', 'cid2', 'client2', 0.1)
                ];
                silentOffersList.forEach(offer => setOfferNotifType(offer, 'silent'));

                prepareTriggerOffers(silentOffersList);

                await waitForBEPromise();
                await triggerOffers(silentOffersList);

                const pushedOfferCollection = getPushedOfferCollections();
                chai.expect(
                  pushedOfferCollection.length,
                  'incorrect count of pushed offer collection'
                ).to.equal(0);
              });

              it('/`silent` offers are not pushed when there are non-silent targeted offers', async () => {
                const nonSilentOffer = buildOffer('o1', 'cid1', 'client1', 0.1);
                const silentOffer = buildOffer('o-silent', 'cid3', 'client3', 0.9);
                setOfferNotifType(silentOffer, 'silent');
                const offersList = [nonSilentOffer, silentOffer];

                prepareTriggerOffers(offersList);

                await waitForBEPromise();
                await triggerOffers(offersList);

                expectSinglePushedOfferCollection([nonSilentOffer]);
              });

              it('/`silent` offers are stored to the local offer database', async () => {
                const silentOffersList = [
                  buildOffer('o1', 'cid1', 'client1', 0.2),
                  buildOffer('o2', 'cid2', 'client2', 0.1)
                ];
                silentOffersList.forEach(offer => setOfferNotifType(offer, 'silent'));

                prepareTriggerOffers(silentOffersList);

                await waitForBEPromise();
                await triggerOffers(silentOffersList);

                const storedOffers = offersDB.getOffers();
                chai.expect(storedOffers.length).to.equal(silentOffersList.length);
                for (const offer of silentOffersList) {
                  const offerID = getOfferID(offer);
                  const hasStoredOffer = offersDB.hasOfferData(offerID);
                  chai.expect(hasStoredOffer).to.be.true;
                }
              });

              it(`/when no targeted offers are relevant,
a reminder is pushed as single offer (not collection) if any`, async () => {
                const storedOffer = buildOffer('o1', 'cid1', 'client1', 0.9);
                offersDB.addOfferObject(storedOffer.offer_id, storedOffer);
                const offersList = [storedOffer];
                // intent-handler is not set-up so it does not return any relevant offers

                await waitForBEPromise();
                await triggerOffers(offersList);

                const pushedOffers = getPushedOffers();
                chai.expect(pushedOffers.length, 'incorrect count of pushed offers').to.equal(1);
              });

              it(`/when only one targeted offer is relevant, it is pushed as single offer
(not collection)`, async () => {
                const offer = buildOffer('o1', 'cid1', 'client1', 0.9);
                const offersList = prepareTriggerOffers([offer]);

                await waitForBEPromise();
                await triggerOffers(offersList);

                const pushedOffers = getPushedOffers(); // not offer-collection
                chai.expect(pushedOffers.length, 'incorrect count of pushed offers').to.equal(1);
                chai.expect(getPushedOfferCollections()).to.be.empty;
              });

              it(`/when multiple offers are relevant and more than one of these,
including the best offer, include the "offers-cc" real-estate, all such offers are pushed together
as a list starting with the best offer to the "offers-cc" real-estate`, async () => {
                const panelOffer = buildOffer('o1', 'cid1', 'client1', 0.9);
                const offersList = [
                  buildOffer('o2', 'cid2', 'client1', 0.8),
                  buildOffer('o3', 'cid3', 'client1', 0.7),
                  buildOffer('o4', 'cid4', 'client2', 0.6)
                ];
                const estates = getOfferRealEstates(panelOffer);
                estates.length = 0;
                estates.push('browser-panel');
                prepareTriggerOffers(offersList.concat(panelOffer));

                await waitForBEPromise();
                await triggerOffers(offersList);

                expectSinglePushedOfferCollection(offersList); // browser-panel offer excluded
              });

              it(`/offer of the week is not pushed in a collection,
but is stored in the local offer database`, async () => {
                const ootw = cloneOffer(VALID_OOTW_OFFER_OBJ);
                const offersList = cloneObject(OFFERS_LIST).concat(ootw);
                prepareTriggerOffers(offersList);
                await waitForBEPromise();

                await triggerOffers(offersList);

                const storedOffers = offersDB.getOffers();
                chai.expect(storedOffers.length).to.equal(offersList.length);
                for (const offer of offersList) {
                  const offerID = getOfferID(offer);
                  const hasStoredOffer = offersDB.hasOfferData(offerID);
                  chai.expect(hasStoredOffer).to.be.true;
                }
                expectSinglePushedOfferCollection(OFFERS_LIST);
              });

              it('/offer of the is pushed as single offer when no targeted offers', async () => {
                const ootw = cloneOffer(VALID_OOTW_OFFER_OBJ);
                const offersList = [ootw];
                prepareTriggerOffers(offersList);
                await waitForBEPromise();

                await triggerOffers(offersList);

                expectSinglePushedOffer(ootw);
              });

              it(`/when an offer's \`trigger_on_advertiser\` is true, 'dot', or 'tooltip',
and when its real estates include "offers-cc", blacklist filters are overridden on its advertiser url
and it is published as a single offer (not as offer-collection)
as defined by its \`trigger_on_advertiser property\``, async () => {
                const BLACKLIST_ADVERTISER_URL = `${BLACKLIST_URL_PREFIX}.advertiser.com`;

                // create an offer with a trigger_on_advertiser property set to true,
                // a 'popup' notif_type, real estates including 'offers-cc',
                // and a page_imp monitor for the blacklisted url
                const offerID = 'offer-with-trigger-on-advertiser';
                const offer = buildOffer(offerID, 'cid', 'client'); // real estates already include "offers-cc"
                setOfferTriggerOnAdvertiser(offer, 'tooltip');
                setOfferNotifType(offer, 'popup');
                const monitor = getOfferMonitorData(offer).find(hasMonitorSignalID('success'));
                setMonitorSignalID(monitor, 'page_imp');
                const { hostname } = new URL(BLACKLIST_ADVERTISER_URL);
                setMonitorPatterns(monitor, [`||${hostname}$script`]);
                setOfferBlacklistPatterns(offer, [`||${hostname}`]);

                const offersList = [offer];
                prepareTriggerOffers(offersList);

                await waitForBEPromise();
                await triggerOffers(offersList, [BLACKLIST_ADVERTISER_URL]);

                const pushedOffers = getPushedOffers().map(getOfferData); // not offer-collection
                chai.expect(pushedOffers.length).to.equal(1);
                const pushedOffer = pushedOffers[0];
                chai.expect(getOfferID(pushedOffer)).to.equal(offerID);
                chai.expect(getOfferNotifType(pushedOffer)).to.equal('tooltip'); // instead of popup
                chai.expect(getPushedOfferCollections()).to.be.empty;
              });

              it(`/offers pushed together as a list are each supplied with a "group" key,
for grouping them by advertiser`, async () => {
                const offer1 = buildOffer('o1', 'cid1', 'client1', 0.9);
                const monitor = getOfferMonitorData(offer1).find(hasMonitorSignalID('success'));
                setMonitorSignalID(monitor, 'page_imp');
                const offer2 = buildOffer('o2', 'cid2', 'client2', 0.8);
                const offersList = prepareTriggerOffers([offer1, offer2]);

                await waitForBEPromise();
                await triggerOffers(offersList);

                const offerCollection = getPushedOfferCollections()
                  .flatMap(getOfferCollectionData);
                const result = offerCollection.map(({ group }) => group);
                chai.expect(result).to.deep.equal([HASH_STRING, 'cid2']);
              });

              describe('/when MAX_GROUPS_IN_OFFER_COLLECTIONS global config setting is defined',
                () => {
                  let originalMaxGroupInOfferCollection;
                  beforeEach(function () {
                    originalMaxGroupInOfferCollection = maxGroupsInOfferCollection;
                    maxGroupsInOfferCollection = 3;
                  });
                  afterEach(function () {
                    maxGroupsInOfferCollection = originalMaxGroupInOfferCollection;
                  });
                  it(`/offers pushed together as a list are limited to
\`settings.MAX_GROUPS_IN_OFFER_COLLECTIONS\` groups`, async () => {
                    const offersList = [
                      buildOffer('o1', 'cid1', 'client1', 1),
                      buildOffer('o2', 'cid2', 'client1', 0.5),
                      buildOffer('o3', 'cid3', 'client2', 0.5),
                      buildOffer('o4', 'cid4', 'client3', 0.5),
                      buildOffer('o5', 'cid5', 'client4', 1)
                    ];
                    const client1Offers = offersList.filter(offer => getOfferClientID(offer) === 'client1');
                    for (const offer of client1Offers) {
                      const monitor = getOfferMonitorData(offer).find(hasMonitorSignalID('success'));
                      setMonitorSignalID(monitor, 'page_imp'); // 'hash_string' group
                    }
                    prepareTriggerOffers(offersList);

                    await waitForBEPromise();
                    await triggerOffers(offersList);

                    const offerCollection = getPushedOfferCollections()
                      .flatMap(getOfferCollectionData);
                    const result = offerCollection.map(({ group }) => group);
                    chai.expect(new Set(result).size).to.equal(3);
                  });
                });

              it(`/offers pushed together as a list are each supplied with "created_ts", "attrs",
and "offer_id" properties`, async () => {
                const bestOffer = buildOffer('o1', 'cid1', 'client1', 0.9);
                const otherOffers = [
                  buildOffer('o2', 'cid2', 'client2', 0.1),
                  buildOffer('o3', 'cid3', 'client3', 0.1)
                ];
                const offersList = [bestOffer].concat(otherOffers);
                prepareTriggerOffers(offersList);

                await waitForBEPromise();
                await triggerOffers(otherOffers.concat(bestOffer));

                const offerCollection = getPushedOfferCollections()
                  .flatMap(getOfferCollectionData);
                // eslint-disable-next-line camelcase
                const result = offerCollection.map(({ offer_data, group, ...rest }) => rest);

                const getCreatedTs = offer => offersDB.getOfferMeta(getOfferID(offer)).c_ts;
                const getLandingPattern = offer => new Offer(offer).getMonitorPatterns('landing');
                const expected = offersList.map(offer => ({
                  attrs: {
                    isCodeHidden: true,
                    landing: getLandingPattern(offer)
                  },
                  created_ts: getCreatedTs(offer),
                  offer_id: getOfferID(offer)
                }));
                chai.expect(head(result)).to.deep.equal(head(expected));
                const compareOfferID = (a, b) =>
                  // eslint-disable-next-line no-nested-ternary
                  (a.offer_id === b.offer_id ? 0 : (a.offer_id > b.offer_id ? 1 : -1));
                chai.expect(tail(result).sort(compareOfferID)).to.deep.equal(
                  tail(expected).sort(compareOfferID)
                );
              });

              it('/offers pushed together as a list are unique (no duplicates)', async () => {
                const offer = buildOffer('o1', 'cid1', 'client1', 0.9);
                const offersList = prepareTriggerOffers([
                  offer,
                  buildOffer('o2', 'cid2', 'client1', 0.8),
                  buildOffer('o3', 'cid3', 'client2', 0.7)
                ]);

                await waitForBEPromise();
                await triggerOffers(offersList.concat(offer));

                expectSinglePushedOfferCollection(offersList);
              });

              it('/offers pushed together as a list include at most one offer per A/B campaign',
                async () => {
                  const o1 = buildOffer('o1', 'cid1', 'client1', 0.9);
                  setOfferAbTestInfo(o1, { start: 0, end: 4999 }); // winning A/B segment
                  const o4 = buildOffer('o4', 'cid1', 'client1', 1.0); // same campaign as o1
                  setOfferAbTestInfo(o4, { start: 5000, end: 9999 }); // loosing A/B segment
                  const uniqueCampaignOffersList = [
                    o1,
                    buildOffer('o2', 'cid2', 'client1', 0.8),
                    buildOffer('o3', 'cid3', 'client2', 0.7)
                  ];
                  const offersList = uniqueCampaignOffersList.concat(o4);
                  prepareTriggerOffers(offersList);

                  await waitForBEPromise();
                  await triggerOffers(offersList);

                  expectSinglePushedOfferCollection(uniqueCampaignOffersList);
                });

              it('/when an offer has previously been displayed, other offers from the same campaign are ignored',
                async () => {
                  const storedOffer = buildOffer('o1', 'cid1', 'client1', 0.1);
                  incOfferActions([storedOffer], 'offer_dsp_session', 1);
                  const uniqueCampaignOffersList = [
                    buildOffer('o2', 'cid2', 'client1', 0.8),
                    buildOffer('o3', 'cid3', 'client2', 0.7)
                  ];
                  const offersList = uniqueCampaignOffersList.concat(
                    buildOffer('o4', 'cid1', 'client1', 1.0), // same campaign as storedOffer
                  );
                  prepareTriggerOffers(offersList);

                  await waitForBEPromise();
                  await triggerOffers(offersList);

                  expectSinglePushedOfferCollection(uniqueCampaignOffersList);
                });

              it('/offers pushed together as a list exclude offers with a `display_id` from another already stored offer',
                async () => {
                  const displayID = 'portal-offer-id';
                  const storedOffer = buildOffer('stored-offer', 'cid1-1', 'client', 0.1);
                  const samePortalOfferAsStoredOffer = buildOffer('from-same-portal-offer', 'cid1-2', 'client', 0.1);
                  setOfferDisplayID(storedOffer, displayID);
                  setOfferDisplayID(samePortalOfferAsStoredOffer, displayID);
                  incOfferActions([storedOffer], 'offer_dsp_session', 1);
                  const uniqueDisplayIDOffersList = [
                    buildOffer('o2', 'cid2', 'client1', 0.8),
                    buildOffer('o3', 'cid3', 'client2', 0.7)
                  ];
                  const offersList = uniqueDisplayIDOffersList.concat(samePortalOfferAsStoredOffer);
                  prepareTriggerOffers(offersList);

                  await waitForBEPromise();
                  await triggerOffers(offersList);

                  expectSinglePushedOfferCollection(uniqueDisplayIDOffersList);
                });

              it('/offers pushed together as a list include at most one offer per `display_id`', async () => {
                const displayID = 'portal-offer-id';
                const o11 = buildOffer('first-offer-from-portal-offer', 'cid1-1', 'client', 0.5);
                const o12 = buildOffer('second-offer-from-portal-offer', 'cid1-2', 'client', 0.5);
                // both offers have same display_id and belong to the same advertiser
                for (const offer of [o11, o12]) {
                  setOfferDisplayID(offer, displayID);
                  const monitor = getOfferMonitorData(offer).find(hasMonitorSignalID('success'));
                  setMonitorSignalID(monitor, 'page_imp');
                }
                const offersList = [
                  buildOffer('o2', 'cid2', 'client1', 0.8),
                  buildOffer('o3', 'cid3', 'client2', 0.7),
                  o11,
                  o12
                ];
                prepareTriggerOffers(offersList);

                await waitForBEPromise();
                await triggerOffers(offersList);

                const pushedOfferCollections = getPushedOfferCollections()
                  .map(getOfferCollectionData);
                chai.expect(pushedOfferCollections.length, 'incorrect count of pushed offer collections')
                  .to.equal(1);
                const pushedOffersList = pushedOfferCollections[0]
                  .map(getOfferFromCollectionEntry);
                chai.expect(pushedOffersList.length, 'incorrect count of offers in collection')
                  .to.equal(3);
              });

              it(`/offers pushed together as a list are sorted by match score,
so the group with the best offer comes first`, async () => {
                const offersList = prepareTriggerOffers([
                  buildOffer('o4', 'cid4', 'client3', 0.6),
                  buildOffer('o2', 'cid2', 'client1', 0.8),
                  buildOffer('o1', 'cid1', 'client1', 0.9),
                  buildOffer('o3', 'cid3', 'client2', 0.7),
                ]);

                await waitForBEPromise();
                await triggerOffers(offersList);

                // sort from highest to lowest display priority
                const sortedOffersList = offersList.sort(
                  (a, b) => getOfferDisplayPriority(b) - getOfferDisplayPriority(a)
                );
                expectSinglePushedOfferCollection(sortedOffersList);
              });

              context('/dynamic-content', () => {
                let dynamicOffersFlag;

                before(() => {
                  dynamicOffersFlag = prefs.get('dynamic-offers.enabled');
                  prefs.set('dynamic-offers.enabled', true);
                });

                after(() => {
                  prefs.set('dynamic-offers.enabled', dynamicOffersFlag);
                });

                it(`/only the best offer in the offers pushed together as a list
includes dynamic content if enabled`, async () => {
                  const offersList = prepareTriggerOffers([
                    buildOffer('o1', 'cid1', DYNAMIC_OFFER_CLIENT_ID, 0.7),
                    buildOffer('o2', 'cid2', DYNAMIC_OFFER_CLIENT_ID, 0.9)
                  ]);

                  await waitForBEPromise();
                  await triggerOffers(offersList);

                  const offerCollection = getPushedOfferCollections()
                    .flatMap(getOfferCollectionData);
                  const pushedOffers = offerCollection.map(getOfferFromCollectionEntry);
                  const bestOffer = head(pushedOffers);
                  const bestOfferID = getOfferID(bestOffer);
                  const isNotBestOffer = not(hasOfferID(bestOfferID));
                  const getNotBestOffer = list => head(list.filter(isNotBestOffer));
                  const notBestOffer = getNotBestOffer(offersList);
                  const notBestPushedOffer = getNotBestOffer(pushedOffers);

                  const getDynamicContent = (offer) => {
                    const template = getOfferTemplateData(offer);
                    return {
                      picture_url: template.picture_url,
                      cta_url: template.call_to_action.url
                    };
                  };
                  chai.expect(getDynamicContent(bestOffer)).to.deep.equal({
                    picture_url: 'picture-url',
                    cta_url: 'cta-url'
                  });
                  chai.expect(getDynamicContent(notBestPushedOffer)).to.deep.equal(
                    getDynamicContent(notBestOffer)
                  );
                });
              });

              it('/offers pushed as a list are added to or updated in the OffersDB', async () => {
                const offersList = prepareTriggerOffers();

                await waitForBEPromise();
                await triggerOffers(offersList);

                const offersInDB = offersList
                  .filter(offer => offersDB.hasOfferObject(getOfferID(offer)))
                  .length;
                chai.expect(offersInDB).to.equal(offersList.length);
              });
            });
          });
        });
      });
    });
  });
