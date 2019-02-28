/* global chai */
/* global describeModule */
/* global require */
/* eslint camelcase: off */

const commonMocks = require('../../utils/common');
const persistenceMocks = require('../../utils/persistence');
const VALID_OFFER_OBJ = require('../../utils/offers/data').VALID_OFFER_OBJ;
const beMocks = require('../../utils/offers/intent');

const HistoryMatcherMock = beMocks['offers-v2/backend-connector'].HistoryMatcherMock;
const CategoryHandlerMock = beMocks['offers-v2/backend-connector'].CategoryHandlerMock;

let ABTestNumber = 0;

export default describeModule('offers-v2/offers/jobs/hard-filters',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    ...beMocks,
    'offers-v2/utils': {
      getABNumber: function () {
        return ABTestNumber;
      },
      timestampMS: function () {
        return Date.now();
      },
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
    describe('#hard-filters', function () {
      let OfferDB;
      let Offer;
      let HardFilters;

      class GeoCheckerMock {
        setRet(v) {
          this.retVal = v;
        }

        matches() {
          return this.retVal;
        }
      }

      beforeEach(function () {
        HardFilters = this.module().default;
        const p1 = this.system.import('offers-v2/offers/offers-db');
        const p2 = this.system.import('offers-v2/offers/actions-defs');
        const p3 = this.system.import('offers-v2/offers/offer');
        return Promise.all([p1, p2, p3]).then((mods) => {
          OfferDB = mods[0].default;
          Offer = mods[2].default;
        });
      });

      function getOfferObj() {
        return JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
      }

      function buildOffer({ filterRules, offer_id, rs_dest }) {
        const o = getOfferObj();
        if (filterRules) {
          o.filterRules = filterRules;
        }
        if (offer_id) {
          o.offer_id = offer_id;
        }
        if (rs_dest) {
          o.rs_dest = rs_dest;
        }

        const offerObj = new Offer(o);
        chai.expect(offerObj.isValid()).eql(true);
        return offerObj;
      }

      context('basic tests', function () {
        let db;
        let offer;
        let ctx;
        let catHandlerMock;
        let hardFilter;

        beforeEach(function () {
          hardFilter = new HardFilters();
          db = new OfferDB({});
          catHandlerMock = new CategoryHandlerMock();
          ctx = {
            presentRealEstates: new Map(),
            geoChecker: new GeoCheckerMock(),
            historyMatcher: new HistoryMatcherMock(/* isHistoryEnabled */ true),
            offersDB: db,
            categoryHandler: catHandlerMock,
            offerIsFilteredOutCb: () => {},
          };
          // set by default the offers-cc real estate
          ctx.presentRealEstates.set('offers-cc', true);
        });

        function checkForOffers(resultList, expectedOffersIds, msg = '') {
          const getIDSFromResult = () => resultList.map(o => o.uniqueID);

          chai.expect(resultList.length, msg).eql(expectedOffersIds.length);
          const resultIds = new Set();
          resultList.forEach(o => resultIds.add(o.uniqueID));
          expectedOffersIds.forEach((oid) => {
            chai.expect(resultIds.has(oid), `couldnt find ${oid} - ${msg} - ${getIDSFromResult()} - expected: ${expectedOffersIds}`).eql(true);
          });
        }

        // /////////////////////////////////////////////////////////////////////
        //                    first level filtering
        // /////////////////////////////////////////////////////////////////////

        it('/ensure building offer is a valid offer', function () {
          const _offer = buildOffer({});
          chai.expect(_offer.isValid()).eql(true);

          // check it pass the hard filters by default
          return hardFilter.process([_offer], ctx).then((r) => {
            chai.expect(r).eql([_offer]);
          });
        });

        it('/filter by real estates works', function () {
          const offers = [
            buildOffer({ offer_id: 'o1', rs_dest: ['offers-cc'] }),
            buildOffer({ offer_id: 'o2', rs_dest: ['browser-panel'] }),
            buildOffer({ offer_id: 'o3', rs_dest: ['cliqz-tab'] }),
            buildOffer({ offer_id: 'o4', rs_dest: ['dropdown', 'offers-cc', 'cliqz-tab'] }),
            buildOffer({ offer_id: 'o5', rs_dest: ['dropdown'] }),
          ];

          // we will let pass o2 and o3 and o4
          ctx.presentRealEstates.clear();
          ctx.presentRealEstates.set('browser-panel', true);
          ctx.presentRealEstates.set('cliqz-tab', true);

          return hardFilter.process(offers, ctx).then((r) => {
            checkForOffers(r, ['o2', 'o3', 'o4']);
          });
        });

        it('/filter offer validity works', function () {
          const _offer = buildOffer({});
          _offer.offerObj.offer_id = null;

          // check it pass the hard filters by default
          return hardFilter.process([_offer], ctx).then((r) => {
            chai.expect(r).eql([]);
          });
        });

        it('/ab test works', function () {
          // set the AB test group on the offer and check if works or not
          ABTestNumber = 101;
          const testSet = [
            { s: 0, e: 100, id: 'no1' },
            { s: 0, e: 101, id: 'yes1' },
            { s: 102, e: 101, id: 'no2' },
            { s: 105, e: 9100, id: 'no3' },
            { s: 0, e: 9100, id: 'yes2' },
          ];
          const expected = ['yes1', 'yes2'];
          const offers = [];
          testSet.forEach((tc) => {
            const o = buildOffer({ offer_id: tc.id });
            o.offerObj.abTestInfo = { start: tc.s, end: tc.e };
            offers.push(o);
          });

          return hardFilter.process(offers, ctx).then((r) => {
            checkForOffers(r, expected);
          });
        });

        it('/geo location works if no geochecker present (filtered)', function () {
          offer = buildOffer({});
          // we will set geo location but geo location is invalid
          offer.offerObj.geo = { de: { munich: [123] } };
          ctx.geoChecker = undefined;

          return hardFilter.process([offer], ctx).then((r) => {
            chai.expect(r).eql([]);
          });
        });

        it('/geo location works if returns false (discarded)', function () {
          offer = buildOffer({});
          // we will set geo location but geo location is invalid
          offer.offerObj.geo = { de: { munich: [123] } };
          ctx.geoChecker.setRet(false);

          return hardFilter.process([offer], ctx).then((r) => {
            chai.expect(r).eql([]);
          });
        });

        it('/geo location works if returns true (accepted)', function () {
          offer = buildOffer({});
          // we will set geo location but geo location is invalid
          offer.offerObj.geo = { de: { munich: [123] } };
          ctx.geoChecker.setRet(true);

          return hardFilter.process([offer], ctx).then((r) => {
            chai.expect(r).eql([offer]);
          });
        });

        it('/categories checks works to filter offers out', function () {
          offer = buildOffer({});
          catHandlerMock.setMockIsCategoryActive(false);
          return hardFilter.process([offer], ctx).then((r) => {
            chai.expect(r).eql([]);
          });
        });
      });
    });
  });
