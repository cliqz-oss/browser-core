/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

const tldjs = require('tldjs');

var prefRetVal = {};
var currentTS = Date.now();
var mockedTimestamp = Date.now() / 1000;
var currentDayHour = 0;
var currentWeekDay = 0;
var abNumber = 0;


export default describeModule('offers-v2/trigger_machine/ops/offer_expr',
  () => ({
    'core/platform': {
      isChromium: false
    },
    'platform/lib/tldjs': {
      default: tldjs,
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/lib/moment': {
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
    'core/crypto/random': {
      random: function () {
        return Math.random();
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
    'core/utils': {
      default: {
        setInterval: function() {},
      }
    },
    'core/helpers/timeout': {
      default: function() { const stop = () => {}; return { stop }; }
    },
    'platform/console': {
      default: {},
    },
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
    'offers-v2/offers-status': {
      default: class {
        constructor() {
          this.lastData = null;
        }
        loadStatusFromObject(d) { this.lastData = d; }
        clear() { this.lastData = null; }
      }
    }
  }),
  () => {
    describe('/offers operations', () => {
      let ops;
      let buildDataGen;
      let ExpressionBuilder;
      let exprBuilder;
      let OfferStatusHandler;
      let oshInstance;

      function buildOp(obj) {
        // wrap into a trigger here
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
        OfferStatusHandler = this.deps('offers-v2/offers-status').default;
        oshInstance = new OfferStatusHandler();
        buildDataGen = {
          offers_status_handler: oshInstance,
        };

        return this.system.import('offers-v2/trigger_machine/exp_builder').then((mod) => {
          ExpressionBuilder = mod.default;
          exprBuilder = new ExpressionBuilder(buildDataGen);
        });
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
        // };

      /**
       * ==================================================
       * $set_offers_status operation tests
       * ==================================================
       */
      describe('/set_offers_status', () => {
        let op;
        let ctx;

        beforeEach(function () {
          oshInstance.clear();
        });

        it('/invalid args', () => {
          let o = ['$set_offers_status', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args 2', () => {
          let o = ['$set_offers_status', ['amazon.com']];
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/set properly', () => {
          const arg = { offer_1: 'inactive', offer_2: 'active' };
          let o = ['$set_offers_status', [arg]];
          return testCase(o, true, ctx).then(() => {
            // check that the request was called
            chai.expect(oshInstance.lastData).eql(arg);
          });
        });

      });

    });
  },
);
