/* global chai */
/* global describeModule */
/* global require */

const adblocker = require('@cliqz/adblocker');
const encoding = require('text-encoding');
const tldjs = require('tldjs');

const VALID_OFFER_OBJ = {
  "action_info": {
      "on_click": "https://www.cliqz.com"
  },
  "campaign_id": "cid_1",
  "client_id": "client-1",
  "display_id": "x-d",
  "filterRules": "generic_comparator('offer_closed','l_u_ts','>=',30) && " +
                 "generic_comparator('offer_shown','counter','<=',5)",
  "offer_id": "x",
  "rule_info": {
      "display_time_secs": 999999,
      "type": "exact_match",
      "url": []
  },
  "ui_info": {
      "template_data": {
          "call_to_action": {
              "target": "",
              "text": "Jetzt Anfordern",
              "url": "http://newurl"
          },
          "conditions": "Some conditions",
          "desc": "Some description",
          "logo_url": "somelogourl",
          "title": "This is the title",
          "voucher_classes": ""
      },
      "template_name": "ticket_template"
  },
  "rs_dest": ["offers-cc"],
  "types": ["type1", "type2"],
  "monitorData": [],
  "categories": ["cat1"],
};

let ABTestNumber = 0;

// needed for the map
let persistence = {};
function delay(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Promise.resolve()
        .then(fn)
        .then(resolve)
        .catch(reject);
    }, 100);
  });
}

class CategoryHandlerMock {
  constructor() {
    this.result = true;
  }

  isCategoryActive(catName) {
    return this.result;
  }
}

function orPromises(elemList, idx = 0) {
  if (!elemList || idx >= elemList.length) {
    return Promise.resolve(false);
  }
  const first = elemList[idx];
  return first().then((r) => {
    if (r) {
      return Promise.resolve(true);
    }
    // if we are in the last case return
    if (elemList.length === (idx + 1)) {
      return Promise.resolve(false);
    }
    return orPromises(elemList, idx + 1);
  });
}

export default describeModule('offers-v2/offers/jobs/hard-filters',
  () => ({
    'platform/lib/adblocker': {
      default: adblocker,
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: (...x) => {console.error(...x);},
        info: (...x) => {console.log(...x);},
        log: (...x) => {console.log(...x);},
        warn: (...x) => {console.warn(...x);},
        logObject: () => {},
      }
    },
    'core/platform': {
      isChromium: false
    },
    'core/cliqz': {
      default: {
        setInterval: function () {}
      },
      utils: {
        setInterval: function () {}
      }
    },
    'platform/globals': {
      default: {}
    },
    'core/crypto/random': {
    },
    'platform/console': {
      default: {}
    },
    'core/prefs': {
      default: {
        get() {}
      },
    },
    'platform/lib/tldjs': {
      default: tldjs,
    },
    'offers-v2/utils': {
      getABNumber: function() {
        return ABTestNumber;
      },
      timestampMS: function() {
        return Date.now();
      },
      orPromises: orPromises,
    },
    'core/persistence/map': {
      default: class MockMap {
        constructor(dbName) {
          persistence[dbName] = (persistence[dbName] || new Map());
          this.db = persistence[dbName];
        }

        init() {
          return Promise.resolve();
        }

        unload() {
          return Promise.resolve();
        }

        get(key) {
          return delay(() => this.db.get(key));
        }

        set(key, value) {
          return delay(() => this.db.set(key, value));
        }

        has(key) {
          return delay(() => this.db.has(key));
        }

        delete(key) {
          return delay(() => this.db.delete(key));
        }

        clear() {
          return delay(() => this.db.clear());
        }

        size() {
          return delay(() => this.db.size());
        }

        keys() {
          return delay(() => [...this.db.keys()]);
        }

        entries() {
          return delay(() => [...this.db.entries()]);
        }
      }
    }
  }),
  () => {
    describe('#hard-filters', function() {
      let OfferDB;
      let OfferFilter;
      let ActionID;
      let Offer;
      let HardFilters;
      let OFFER_FILTER_STATE;

      class GeoCheckerMock {
        setRet(v) {
          this.retVal = v;
        }
        matches(data) {
          return this.retVal;
        }
      }

      class HistoryMatcherMock {
        setRet(v) {
          this.retVal = v;
        }
        hasHistoryEnabled() { return true; }
        countMatchesWithPartialCheck(q, p, pi) {
          return this.retVal;
        }
        countMatches(query, patternObj, patternIndex) {
          return Promise.resolve(this.retVal);
        }
      }

      beforeEach(function () {
        HardFilters = this.module().default;
        OFFER_FILTER_STATE = this.module().OFFER_FILTER_STATE;
        const p1 = this.system.import('offers-v2/offers/offers-db');
        const p2 = this.system.import('offers-v2/offers/actions-defs');
        const p3 = this.system.import('offers-v2/offers/offer');
        return Promise.all([p1, p2, p3]).then((mods) => {
          OfferDB = mods[0].default;
          ActionID = mods[1].default;
          Offer = mods[2].default;
        });
      });

      function getOfferObj() {
        return JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
      }

      function buildOffer({ filterRules, offer_id, rs_dest, historyChecks }) {
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
        if (historyChecks) {
          o.historyChecks = historyChecks;
        }

        const offerObj = new Offer(o);
        chai.expect(offerObj.isValid()).eql(true);
        return offerObj;
      }

      context('basic tests', function () {
        let db;
        let fer;
        let offerObj;
        let offer;
        let ctx;
        let catHandlerMock;
        let hardFilter;

        beforeEach(function () {
          hardFilter = new HardFilters();
          db = new OfferDB({});
          offerObj = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          catHandlerMock = new CategoryHandlerMock();
          ctx = {
            presentRealEstates: new Map(),
            geoChecker: new GeoCheckerMock(),
            historyMatcher: new HistoryMatcherMock(),
            offersDB: db,
            categoryHandler: catHandlerMock,
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
          const offer = buildOffer({});
          chai.expect(offer.isValid()).eql(true);

          // check it pass the hard filters by default
          return hardFilter.process([offer], ctx).then((r) => {
            chai.expect(r).eql([offer]);
          });
        });

        it('/filter by real estates works', function () {
          const offers = [
            buildOffer({ offer_id: 'o1', rs_dest: ["offers-cc"] }),
            buildOffer({ offer_id: 'o2', rs_dest: ["browser-panel"] }),
            buildOffer({ offer_id: 'o3', rs_dest: ["cliqz-tab"] }),
            buildOffer({ offer_id: 'o4', rs_dest: ["dropdown", "offers-cc", "cliqz-tab"] }),
            buildOffer({ offer_id: 'o5', rs_dest: ["dropdown"] }),
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
          const offer = buildOffer({});
          offer.offerObj.offer_id = null;

          // check it pass the hard filters by default
          return hardFilter.process([offer], ctx).then((r) => {
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
            const o = buildOffer({ offer_id: tc.id })
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

        it('/history checks works as expected if no feature present', function () {
          offer = buildOffer({});

          // we will set history hceck but dissable feature
          offer.offerObj.historyChecks = [{
            patterns: { pid: '123', p_list: ['||google.com'] },
            min_matches_expected: 2,
            since_secs: 10,
            till_secs: 0,
            remove_if_matches: false }];
          ctx.historyMatcher = undefined;
          return hardFilter.process([offer], ctx).then((r) => {
            chai.expect(r).eql([]);
          });
        });

        it('/history checks works as expected if returns proper values', function () {
          const offers = [
            buildOffer({ offer_id: 'no1', historyChecks : [{
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 4,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: false }]}),
            buildOffer({ offer_id: 'no2', historyChecks : [{
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 5,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: false }]}),
            buildOffer({ offer_id: 'yes1', historyChecks : [{
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 1,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: false }]}),
            buildOffer({ offer_id: 'yes2', historyChecks : [{
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 2,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: false }]}),
            buildOffer({ offer_id: 'no3', historyChecks : [{
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 2,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: true }]}),
            buildOffer({ offer_id: 'no4', historyChecks : [{
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 1,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: false },
              {
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 5,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: false }]}),
            buildOffer({ offer_id: 'yes3', historyChecks : [{
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 1,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: false },
              {
              patterns: { pid: '123', p_list: ['||google.com'] },
              min_matches_expected: 2,
              since_secs: 10,
              till_secs: 0,
              remove_if_matches: false }]}),
          ];
          // we will set history hceck but dissable feature
          ctx.historyMatcher.setRet(2);
          return hardFilter.process(offers, ctx).then((r) => {
            checkForOffers(r, ['yes1', 'yes2', 'yes3']);
          });
        });


        it('/categories checks works to filter offers out', function () {
          offer = buildOffer({});
          catHandlerMock.result = false;
          return hardFilter.process([offer], ctx).then((r) => {
            chai.expect(r).eql([]);
          });
        });

      });
    });
  }
);
