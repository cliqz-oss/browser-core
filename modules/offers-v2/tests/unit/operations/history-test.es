/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

var prefRetVal = {};
var currentTS = Date.now();
var mockedTimestamp = Date.now() / 1000;
var currentDayHour = 0;
var currentWeekDay = 0;
var abNumber = 0;


export default describeModule('offers-v2/trigger_machine/ops/history_expr',
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
    'offers-v2/utils': {
      timestamp: function() {
        return mockedTimestamp;
      },
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
    'offers-v2/history_index': {
      default: class {
        constructor() {
          this.start = null;
          this.end = null;
          this.lastUrl = null;
          this.context = null;
          this.ret = [];
          this.retCount = 0;
        }
        queryHistory(s, e) {
          this.start = s;
          this.end = e;
          return this.ret;
        }
        addUrl(url, context) {
          this.lastUrl = url;
          this.context = context;
        }
        hasUrl(context) {
          return false;
        }
        countHistoryEntries(s, e, p, id) {
          let c = 0;
          this.start = s;
          this.end = e;

          this.ret.forEach((urlElem) => {
            if (urlElem && urlElem.url) {
              p.forEach((pattern) => {
                if (pattern.test(urlElem.url)) {
                  c += 1;
                }
              });
            }
          });
          return c;
        }
        clear() {
          this.start = null;
          this.end = null;
          this.lastUrl = null;
          this.context = null;
          this.ret = [];
          this.retCount = 0;
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
    describe('/history operations', () => {
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
      let HistoryIndex;
      let historyIdxMock;

      function buildOp(obj) {
        const t = {
          parent_trigger_ids: [],
          trigger_id: 'trigger-test',
          ttl: 3600,
          condition: null,
          actions: obj
        };
        return exprBuilder.createExp(obj, t);
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
        HistoryIndex = this.deps('offers-v2/history_index').default;
        historyIdxMock = new HistoryIndex();
        prefRetVal = {};

        buildDataGen = {
          regex_cache: new RegexpCache(),
          offers_db: odb,
          offer_processor: offerProcMock,
          history_index: historyIdxMock
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
       * $match_history operation tests
       * ==================================================
       */
      describe('/match_history', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          offerProcMock.clear();
          historyIdxMock.clear();
        });

        it('/invalid args call', () => {
          let o = ['$match_history', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$match_history', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 3', () => {
          let o = ['$match_history', [1, 2]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple checks exists but different value', () => {
          ctx = { '#lc_url': 'https://amazon.de/basket' };
          let o = ['$match_history', [60, 2, 'amazon.de/basket']];
          mockedTimestamp = Date.now() / 1000;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(r).eql(0);
            chai.expect(historyIdxMock.start).eql(mockedTimestamp - 60);
            chai.expect(historyIdxMock.end).eql(mockedTimestamp - 2);
            chai.expect(historyIdxMock.context).eql({ '#lc_url': 'https://amazon.de/basket' });
            chai.expect(historyIdxMock.lastUrl).eql('https://amazon.de/basket');
          });
        });

        it('/not in history', () => {
          ctx = { '#lc_url': 'https://ebay.de/basket' };
          let o = ['$match_history', [60, 2, 'amazon.de/basket']];
          historyIdxMock.ret = [{ url: 'https://www.ebay.de/basket' }];
          mockedTimestamp = Date.now() / 1000;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(r).eql(0);
            chai.expect(historyIdxMock.start).eql(mockedTimestamp - 60);
            chai.expect(historyIdxMock.end).eql(mockedTimestamp - 2);
            // add was not called
            chai.expect(historyIdxMock.context).eql(null);
            chai.expect(historyIdxMock.lastUrl).eql(null);
          });
        });

        it('/pattern doesn\'t match', () => {
          ctx = { '#lc_url': 'https://ebay.de/basket' };
          let o = ['$match_history', [60, 2, 'ebay.de/basket']];
          historyIdxMock.ret = ['https://www.ebay.de/basket']; // invalid format
          mockedTimestamp = Date.now() / 1000;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(r).eql(0);
            chai.expect(historyIdxMock.start).eql(mockedTimestamp - 60);
            chai.expect(historyIdxMock.end).eql(mockedTimestamp - 2);
            chai.expect(historyIdxMock.context).eql({ '#lc_url': 'https://ebay.de/basket' });
            chai.expect(historyIdxMock.lastUrl).eql('https://ebay.de/basket');
          });
        });

        // it('/pattern doesn\'t match', () => {
        //   mockEventLoop({
        //     historyIndex: {
        //       queryHistory: (start, end) => ['https://www.ebay.de/basket'],
        //       addUrl: (url, context) => hookedFunc(url, context)
        //     },
        //     regexpCache: {
        //       getRegexp: pattern => new RegExp(pattern)
        //     },
        //   });

        //   return Promise.all([
        //     op.call(this, [60, 2, 'ebay.de/basket'], eventLoop, { '#lc_url': 'https://amazon.de/basket' }).then(
        //       (result) => {
        //         chai.expect(r).eql(0);
        //         chai.expect(resultHookedFunc).eql(undefined);
        //       },
        //       (error) => {
        //         chai.assert.fail(error, 0, error);
        //       }
        //     ),
        //   ]);
        // });

        it('/in history/one record', () => {
          ctx = { '#lc_url': 'https://amazon.de/basket' };
          let o = ['$match_history', [60, 2, 'amazon.de/basket']];
          historyIdxMock.ret = [{ url: 'https://amazon.de/basket' }];
          mockedTimestamp = Date.now() / 1000;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(r).eql(1);
            chai.expect(historyIdxMock.start).eql(mockedTimestamp - 60);
            chai.expect(historyIdxMock.end).eql(mockedTimestamp - 2);
            chai.expect(historyIdxMock.context).eql({ '#lc_url': 'https://amazon.de/basket' });
            chai.expect(historyIdxMock.lastUrl).eql('https://amazon.de/basket');
          });
        });

        it('/in history/three records', () => {
          ctx = { '#lc_url': 'https://amazon.de/basket' };
          let o = ['$match_history', [60, 2, 'amazon.de/basket']];
          historyIdxMock.ret = [
                { url: 'https://ebay.de/basket/step1' },
                { url: 'https://amazon.de/basket/step1' },
                { url: 'https://amazon.de/basket/step2' },
                { url: 'https://amazon.de/basket/thankyou' }];
          mockedTimestamp = Date.now() / 1000;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(r).eql(3);
            chai.expect(historyIdxMock.start).eql(mockedTimestamp - 60);
            chai.expect(historyIdxMock.end).eql(mockedTimestamp - 2);
            chai.expect(historyIdxMock.context).eql({ '#lc_url': 'https://amazon.de/basket' });
            chai.expect(historyIdxMock.lastUrl).eql('https://amazon.de/basket');
          });
        });

        it('/in history/multiple patterns/four records', () => {
          ctx = { '#lc_url': 'https://amazon.de/basket' };
          let o = ['$match_history', [60, 2, 'ebay.de', 'amazon.de/basket']];
          historyIdxMock.ret = [
                { url: 'https://ebay.de/basket/step1' },
                { url: 'https://amazon.de/basket/step1' },
                { url: 'https://amazon.de/basket/step2' },
                { url: 'https://amazon.de/basket/thankyou' }];
          mockedTimestamp = Date.now() / 1000;
          return buildAndExec(o, ctx).then((r) => {
            chai.expect(r).eql(4);
            chai.expect(historyIdxMock.start).eql(mockedTimestamp - 60);
            chai.expect(historyIdxMock.end).eql(mockedTimestamp - 2);
            chai.expect(historyIdxMock.context).eql({ '#lc_url': 'https://amazon.de/basket' });
            chai.expect(historyIdxMock.lastUrl).eql('https://amazon.de/basket');
          });
        });

        // TODO: add tests:
        // - multiple urls that match the patters are added to the history

      });
    });
  },
);
