/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

var prefRetVal = {};
var currentTS = Date.now();
var currentDayHour = 0;
var currentWeekDay = 0;
var abNumber = 0;


export default describeModule('offers-v2/trigger_machine/ops/display_expr',
  () => ({
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
        logObject: () => {},
      }
    },
    'core/platform': {
      isChromium: false
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
    'platform/gzip': {
      default: {}
    },
    'platform/globals': {
      default: {}
    },
    'platform/environment': {
      default: {}
    },
    'core/time': {
      getDaysFromTimeRange: function(startTS, endTS) { },
      getDateFromDateKey: function(dateKey, hours = 0, min = 0, seconds = 0) { },
      timestamp: function() { },
      getTodayDayKey: function() { }
    },
    'offers-v2/utils': {
      timestampMS: function() {
        return currentTS;
      },
      dayHour: function() {
        return currentDayHour;
      },
      weekDay: function() {
        return currentWeekDay;
      },
      getABNumber: function() {
        return abNumber;
      }
    },
    'offers-v2/offers_db': {
      default: class {
        constructor() {
          this.offerMetaMap = {};
        }
        getOfferMeta(oid) {
          return this.offerMetaMap[oid];
        }
        clear() {
          this.offerMetaMap = {};
        }
      }
    },
    'offers-v2/offer_processor': {
      default: class {
        constructor() {
          this.lastSelOffer = null;
          this.lastRInfo = null;
        }
        pushOffer(selOffer, rinfo) {
          this.lastSelOffer = selOffer;
          this.lastRInfo = rinfo;
          return true;
        }
        clear() {
          this.lastSelOffer = null;
          this.lastRInfo = null;
        }
      }
    },
    'core/crypto/random': {
      random: function () {
        return Math.random();
      }
    },
    'offers-v2/regexp_cache': {
      default: class {
        getRegexp(p) {
          return new RegExp(p);
        }
      }
    },
    'core/prefs': {
      default: {
        get: function(v, d) {
          if (prefRetVal[v]) {
            return prefRetVal[v];
          }
          return d;
        },
        setMockVal: function(varName, val) {
          prefRetVal[varName] = val;
        }
      }
    },
    'core/cliqz': {
      default: {},
      utils: {
        setInterval: function() {},
      }
    },
    'platform/console': {
      default: {},
    },
  }),
  () => {
    describe('/display operations', () => {
      let ops;
      let eventLoop;
      let buildDataGen;
      let prefMock;
      let ExpressionBuilder;
      let exprBuilder;
      let odb;
      let OfferDB;
      let OfferProcessor;
      let offerProcMock;
      let RegexpCache;

      function buildOp(obj) {
        return exprBuilder.createExp(obj);
      }

      function testCase(op, expectedVal, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).to.eq(expectedVal);
        });
      }

      function buildAndExec(op, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx);
      }

      beforeEach(function () {
        ops = this.module().default;
        prefMock = this.deps('core/prefs').default;
        RegexpCache = this.deps('offers-v2/regexp_cache').default;
        OfferDB = this.deps('offers-v2/offers_db').default;
        odb = new OfferDB();
        OfferProcessor = this.deps('offers-v2/offer_processor').default;
        offerProcMock = new OfferProcessor();
        prefRetVal = {};

        buildDataGen = {
          regex_cache: new RegexpCache(),
          offers_db: odb,
          offer_processor: offerProcMock
        };
        return this.system.import('offers-v2/trigger_machine/exp_builder').then((mod) => {
          ExpressionBuilder = mod.default;
          exprBuilder = new ExpressionBuilder(buildDataGen);
        });

        // const buildData = {
        //   raw_op: {
        //     op_name: opName,
        //     args,
        //     ttl
        //   },
        //   exp_builder: this,
        //   regex_cache: this.globObjs.regex_cache,
        //   trigger_cache: this.globObjs.trigger_cache,
        //   trigger_machine: this.globObjs.trigger_machine,
        //   offer_processor: this.globObjs.offer_processor,
        //   signals_handler: this.globObjs.signals_handler,
        //   offers_db: this.globObjs.offers_db,
        //   history_index: this.globObjs.history_index,
        //   last_campaign_signal_db: this.globObjs.last_campaign_signal_db,
        //   url_signal_db: this.globObjs.url_signal_db
        // };
      });

      /**
       * ==================================================
       * $show_offer operation tests
       * ==================================================
       */
      describe('/show_offer', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          offerProcMock.clear();
        });

        it('/invalid args call', () => {
          let o = ['$show_offer', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/push offer', () => {
          const offerInfo = {
            rule_info: {
              type: 'exact_match',
              url: ['https://www.amazon.de']
            },
            offer_id: 'HC1234'
          };
          let o = ['$show_offer', ['https://www.amazon.de', offerInfo]];
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(offerProcMock.lastSelOffer).to.exist;
            chai.expect(offerProcMock.lastRInfo).to.exist;
            chai.expect(offerProcMock.lastSelOffer).eql(offerInfo);
            chai.expect(offerProcMock.lastRInfo).eql(offerInfo.rule_info);
            chai.expect(r).eql(true);
          });
        });

        it('/push offer updates rule info', () => {
          const offerInfo = {
            rule_info: {
              type: 'exact_match',
              url: ['https://www.amazon.de']
            },
            offer_id: 'HC1234'
          };
          const offerInfoExpected = {
            rule_info: {
              type: 'exact_match',
              url: ['https://www.amazon.de2']
            },
            offer_id: 'HC1234'
          };
          let o = ['$show_offer', ['https://www.amazon.de2', offerInfo]];
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(offerProcMock.lastSelOffer).to.exist;
            chai.expect(offerProcMock.lastRInfo).to.exist;
            chai.expect(offerProcMock.lastSelOffer).eql(offerInfoExpected);
            chai.expect(offerProcMock.lastRInfo).eql(offerInfoExpected.rule_info);
          });
        });
      });

      /**
       * ==================================================
       * offer_added operation tests
       * ==================================================
       */
      describe('/offer_added', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          offerProcMock.clear();
          odb.clear();
        });

        it('/invalid args call', () => {
          let o = ['$offer_added', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$offer_added', ['xyz']];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/nonexist offer', () => {
          let o = ['$offer_added', ['xyz', 3]];
          return testCase(o, false, ctx);
        });

        it('/within 30 minutes', () => {
          let o = ['$offer_added', ['xyz', 30]];
          currentTS = Date.now();
          odb.offerMetaMap['xyz'] = {
            l_u_ts: currentTS - (29*1000)
          }
          return testCase(o, true, ctx);
        });

        it('/within 31 minutes false', () => {
          let o = ['$offer_added', ['xyz', 30]];
          currentTS = Date.now();
          odb.offerMetaMap['xyz'] = {
            l_u_ts: currentTS - (31*1000)
          }
          return testCase(o, false, ctx);
        });

      });

      /**
       * ==================================================
       * show_ab_offer operation tests
       * ==================================================
       */
      describe('/show_ab_offer', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          offerProcMock.clear();
          odb.clear();
        });

        it('/invalid args call', () => {
          let o = ['$show_ab_offer', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$show_ab_offer', ['https://www.amazon.de']];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/display offer/choose the first offer', () => {
          const rule_info = {
            type: 'exact_match',
            url: ['https://www.amazon.de']
          };
          const offersData = [
            { ab_test_info: { pct: 50 }, rule_info, offer_id: 'HC1' },
            { ab_test_info: { pct: 50 }, rule_info, offer_id: 'HC2' },
          ];
          let o = ['$show_ab_offer', ['https://www.amazon.de', offersData]];
          abNumber = 4999;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(offerProcMock.lastSelOffer).to.exist;
            chai.expect(offerProcMock.lastRInfo).to.exist;
            chai.expect(offerProcMock.lastSelOffer).eql(offersData[0]);
            chai.expect(offerProcMock.lastRInfo).eql({ type: 'exact_match', url: ['https://www.amazon.de'] });
            chai.expect(r).eql(true);
          });
        });

        it('/display offer/choose the second offer', () => {
          const rule_info = {
            type: 'exact_match',
            url: ['https://www.amazon.de']
          };
          const offersData = [
            { ab_test_info: { pct: 50 }, rule_info, offer_id: 'HC1' },
            { ab_test_info: { pct: 50 }, rule_info, offer_id: 'HC2' },
          ];
          let o = ['$show_ab_offer', ['https://www.amazon.de', offersData]];
          abNumber = 5000;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(offerProcMock.lastSelOffer).to.exist;
            chai.expect(offerProcMock.lastRInfo).to.exist;
            chai.expect(offerProcMock.lastSelOffer).eql(offersData[1]);
            chai.expect(offerProcMock.lastRInfo).eql({ type: 'exact_match', url: ['https://www.amazon.de'] });
            chai.expect(r).eql(true);
          });
        });

        it('/display offer/four offers', () => {
          const rule_info = {
            type: 'exact_match',
            url: ['https://www.amazon.de']
          };
          const offersData = [
            { ab_test_info: { pct: 0.25 }, rule_info: {}, offer_id: 'HC1' },
            { ab_test_info: { pct: 0.25 }, rule_info: {}, offer_id: 'HC2' },
            { ab_test_info: { pct: 0.25 }, rule_info: {}, offer_id: 'HC3' },
            { ab_test_info: { pct: 0.25 }, rule_info: {}, offer_id: 'HC4' },
          ];
          let o = ['$show_ab_offer', ['https://www.amazon.de', offersData]];
          abNumber = 6000;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(offerProcMock.lastSelOffer).to.exist;
            chai.expect(offerProcMock.lastRInfo).to.exist;
            chai.expect(offerProcMock.lastSelOffer).eql(offersData[2]);
            chai.expect(offerProcMock.lastRInfo).eql({ type: 'exact_match', url: ['https://www.amazon.de'] });
            chai.expect(r).eql(true);
          });
        });
      });
    });
  },
);
