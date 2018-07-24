/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

const tldjs = require('tldjs');

const prefRetVal = {};
const currentTS = Date.now();
const mockedTimestamp = Date.now() / 1000;
const currentDayHour = 0;
const currentWeekDay = 0;
const abNumber = 0;


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
      timestamp: function () {
        return mockedTimestamp;
      },
      timestampMS: function () {
        return currentTS;
      },
      dayHour: function () {
        return currentDayHour;
      },
      weekDay: function () {
        return currentWeekDay;
      },
      getABNumber: function () {
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
        get: function (v, d) {
          if (prefRetVal[v]) {
            return prefRetVal[v];
          }
          return d;
        },
        setMockVal: function (varName, val) {
          prefRetVal[varName] = val;
        }
      }
    },
    'core/utils': {
      default: {}
    },
    'core/helpers/timeout': {
      default: function () { const stop = () => {}; return { stop }; }
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

      beforeEach(function () {
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
          const o = ['$set_offers_status', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args 2', () => {
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/set properly', () => {
          const arg = { offer_1: 'inactive', offer_2: 'active' };
          const o = ['$set_offers_status', [arg]];
          return testCase(o, true, ctx).then(() => {
            // check that the request was called
            chai.expect(oshInstance.lastData).eql(arg);
          });
        });
      });
    });
  },
);
