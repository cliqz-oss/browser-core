/* global chai */
/* global describeModule */
/* global require */
/* eslint camelcase: off */

const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const beMocks = require('../utils/offers/intent');

const BackendConnectorMock = beMocks['offers-v2/backend-connector'].BackendConnectorMock;
const IntentHandlerMock = beMocks['offers-v2/backend-connector'].IntentHandlerMock;

let shouldKeepResourceRet = false;

export default describeModule('offers-v2/offers/intent-offers-handler',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    ...beMocks,
    'platform/xmlhttprequest': {
      default: {}
    },
    'core/http': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
    'platform/gzip': {
      default: {}
    },

    'platform/environment': {
      default: {}
    },
    'offers-v2/utils': {
      timestampMS: function () {
        return Date.now();
      },
      shouldKeepResource: function () {
        return shouldKeepResourceRet;
      },
    },
  }),
  () => {
    describe('general tests', function () {
      let IntentOffersHandler;
      let beConnector;
      let ihandlerMock;
      let ioh;
      beforeEach(function () {
        IntentOffersHandler = this.module().default;
      });

      describe('#basics', function () {
        function checkResult(idList) {
          const resultOffers = ioh.getOffersForIntent('intent-name');
          const resultIDs = new Set();
          resultOffers.forEach(o => resultIDs.add(o.uniqueID));
          chai.expect(resultIDs.size, 'there are more or less elements than expected').eql(idList.length);
          idList.forEach(id =>
            chai.expect(resultIDs.has(id), `missing offer id: ${id}`).eql(true));
        }

        context('/validity checks', function () {
          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            beConnector = new BackendConnectorMock();
            ihandlerMock = new IntentHandlerMock();
            ioh = new IntentOffersHandler(beConnector, ihandlerMock);
          });

          it('/check user_group undefined works', function () {
            const offers = [
              {
                offer_id: 'o1',
              },
              {
                offer_id: 'o2',
              },
              {
                offer_id: 'o3',
              },
              {
                offer_id: 'o4',
              }
            ];
            // configure the bemock
            beConnector.setMockResult(offers);
            ihandlerMock.mock_addIntent('intent-name', 999);
            return ioh.fetchOffersForIntent('intent-name').then(() => {
              checkResult(['o1', 'o2', 'o3', 'o4']);
            });
          });

          it('/check user_group filter works', function () {
            const offers = [
              {
                offer_id: 'o1',
              },
              {
                offer_id: 'o2',
                user_group: 1,
              },
              {
                offer_id: 'o3',
                user_group: 100,
              },
              {
                offer_id: 'o4',
              }
            ];
            // configure the bemock
            beConnector.setMockResult(offers);
            shouldKeepResourceRet = false;
            ihandlerMock.mock_addIntent('intent-name', 999);
            return ioh.fetchOffersForIntent('intent-name').then(() => {
              checkResult(['o1', 'o4']);
            });
          });

          it('/check user_group filter works 2', function () {
            const offers = [
              {
                offer_id: 'o1',
              },
              {
                offer_id: 'o2',
                user_group: 1,
              },
              {
                offer_id: 'o3',
                user_group: 100,
              },
              {
                offer_id: 'o4',
              }
            ];
            // configure the bemock
            beConnector.setMockResult(offers);
            shouldKeepResourceRet = true;
            ihandlerMock.mock_addIntent('intent-name', 999);
            return ioh.fetchOffersForIntent('intent-name').then(() => {
              checkResult(['o1', 'o2', 'o3', 'o4']);
            });
          });
        });
      });
    });
  });
