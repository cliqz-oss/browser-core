/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */


var prefRetVal = {};
var currentTS = Date.now();
var currentDayHour = 0;
var currentWeekDay = 0;
let hookedResultOfLoggerInfo;

export default describeModule('offers-v2/trigger_machine/ops/control_expr',
  () => ({
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
      timestampMS: function() {
        return currentTS;
      },
      dayHour: function() {
        return currentDayHour;
      },
      weekDay: function() {
        return currentWeekDay;
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
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: () => {},
        info: (...args) => { hookedResultOfLoggerInfo = args; },
        log: () => {},
        warn: () => {},
        logObject: () => {},
      }
    },
    'offers-v2/query_handler': {
      default: class {
        normalize() {
          return 'normal';
        }
        normalizeTokenList(list) {
          if (list === ['test']) {
            return ['test'];
          }
          return [];
        }
        matchTokens() {
          return true;
        }
     }
    },
  }),
  () => {
    describe('/control operations', () => {
      let ops;
      let eventLoop;
      let buildDataGen;
      let prefMock;
      let ExpressionBuilder;
      let exprBuilder;
      let RegexpCache;
      let QHandlerMock;

      function buildOp(obj) {
        return exprBuilder.createExp(obj);
      }

      function testCase(op, expectedVal, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).to.eq(expectedVal);
        });
      }

      beforeEach(function () {
        ops = this.module().default;
        prefMock = this.deps('core/prefs').default;
        RegexpCache = this.deps('offers-v2/regexp_cache').default;
        QHandlerMock = this.deps('offers-v2/query_handler').default;
        prefRetVal = {};
        buildDataGen = {
          regex_cache: new RegexpCache(),
          query_handler: new QHandlerMock()
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
       * $if_pref operation tests
       * ==================================================
       */
      describe('/if_pref', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          const o = [
            '$if_pref',
            [
              'test'
            ]
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = [
            '$if_pref',
            [
            ]
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple checks exists but different value', () => {
          let o = ['$if_pref', ['test_pref', false]];
          prefMock.setMockVal('test_pref', true);
          return testCase(o, false, ctx);
        });

        it('/simple checks exists and same value', () => {
          let o = ['$if_pref', ['test_pref', false]];
          prefMock.setMockVal('test_pref', true);
          return testCase(o, false, ctx);
        });

        it('/simple checks not exists string', () => {
          let o = ['$if_pref', ['test_pref_str', 'value1']];
          prefMock.setMockVal('test_pref', true);
          return testCase(o, false, ctx);
        });

        it('/simple checks exists string different value', () => {
          let o = ['$if_pref', ['test_pref_str', 'value1']];
          prefMock.setMockVal('test_pref_str', 'value2');
          return testCase(o, false, ctx);
        });

        it('/simple checks exists string same value', () => {
          let o = ['$if_pref', ['test_pref_str', 'value1']];
          prefMock.setMockVal('test_pref_str', 'value1');
          return testCase(o, true, ctx);
        });
      });

      /**
       * ==================================================
       * log operation tests
       * ==================================================
       */
      describe('/log', () => {
        let ctx;
        let op;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          let o = ['$log', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        // it('/simple checks', () => {
        //   return Promise.all([
        //     op.call(this, ['signals sent'], eventLoop).then(
        //       (result) => {
        //         chai.expect(result).eql(undefined);
        //         chai.expect(hookedResultOfLoggerInfo.length).eql(1);
        //         chai.expect(hookedResultOfLoggerInfo[0]).eql('signals sent');
        //       },
        //       (error) => {
        //         chai.assert.fail(error, undefined, error);
        //       }
        //     ),
        //   ]);
        // });

        // TODO: We have to write this test after we get the latest logger integration
      //   it('/simple checks', () => {
      //     return Promise.all([
      //       op.call(this, ['signals sent'], eventLoop).then(
      //         (result) => {
      //           chai.expect(result).eql(undefined);
      //           chai.expect(resultHookedFunc.length).eql(2);
      //           chai.expect(resultHookedFunc[0]).eql('Trigger');
      //           chai.expect(resultHookedFunc[1]).eql('signals sent');
      //         },
      //         (error) => {
      //           chai.assert.fail(error, undefined, error);
      //         }
      //       ),
      //     ]);
      //   });
      //
      });

      // /**
      //  * ==================================================
      //  * and operation tests
      //  * ==================================================
      //  */
      describe('/and', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          let o = ['$and', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$and', [true]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check true', () => {
          let o = ['$and', [true]];
          return testCase(o, true, ctx);
        });

        it('/simple check true true = true', () => {
          let o = ['$and', [true, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check true false = false', () => {
          let o = ['$and', [true, false]];
          return testCase(o, false, ctx);
        });

        it('/simple check false true true = false', () => {
          let o = ['$and', [false, true, true]];
          return testCase(o, false, ctx);
        });

        it('/simple check true true true false = false', () => {
          let o = ['$and', [true, true, true, false]];
          return testCase(o, false, ctx);
        });

        // TODO: we should add the lazy test check here, if it is false the first we should
        // not evaluate anymore the next expressions
      });

      /**
       * ==================================================
       * or operation tests
       * ==================================================
       */
      describe('/or', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          let o = ['$or', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$or', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 3', () => {
          let o = ['$or', [true]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check true true = true', () => {
          let o = ['$or', [true, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check true false = true', () => {
          let o = ['$or', [true, false]];
          return testCase(o, true, ctx);
        });

        it('/simple check false true = true', () => {
          let o = ['$or', [false, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check false false false true = true', () => {
          let o = ['$or', [false, false, false, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check false false false false = false', () => {
          let o = ['$or', [false, false, false, false]];
          return testCase(o, false, ctx);
        });
      });

      /**
       * ==================================================
       * not operation tests
       * ==================================================
       */
      describe('/not', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          let o = ['$not', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call', () => {
          let o = ['$not', [true, false]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check false = true', () => {
          let o = ['$not', [false]];
          return testCase(o, true, ctx);
        });

        it('/simple check true = false', () => {
          let o = ['$not', [true]];
          return testCase(o, false, ctx);
        });

        it('/simple check false = true', () => {
          let o = ['$not', [false]];
          return testCase(o, true, ctx);
        });

      });

      /**
       * ==================================================
       * eq operation tests
       * ==================================================
       */
      describe('/eq', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          let o = ['$eq', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$eq', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check true true = true', () => {
          let o = ['$eq', [true, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check true false = false', () => {
          let o = ['$eq', [true, false]];
          return testCase(o, false, ctx);
        });

        it('/simple check 1 1 = true', () => {
          let o = ['$eq', [1, 1]];
          return testCase(o, true, ctx);
        });

        it('/simple check asd asd = true', () => {
          let o = ['$eq', ['asd', 'asd']];
          return testCase(o, true, ctx);
        });

        it('/simple check asd true = false', () => {
          let o = ['$eq', ['asd', true]];
          return testCase(o, false, ctx);
        });
      });

      //  *
      //  * ==================================================
      //  * gt operation tests
      //  * ==================================================

      describe('/gt', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          let o = ['$gt', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$gt', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check 1 > 1 = false', () => {
          let o = ['$gt', [1, 1]];
          return testCase(o, false, ctx);
        });

        it('/simple check 1 > 2 = false', () => {
          let o = ['$gt', [1, 2]];
          return testCase(o, false, ctx);
        });

        it('/simple check 2 > 1 = true', () => {
          let o = ['$gt', [2, 1]];
          return testCase(o, true, ctx);
        });

      });

      /**
       * ==================================================
       * lt operation tests
       * ==================================================
       */
      describe('/lt', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          let o = ['$lt', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$lt', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check 1 < 1 = false', () => {
          let o = ['$gt', [1, 1]];
          return testCase(o, false, ctx);
        });

        it('/simple check 1 < 2 = true', () => {
          let o = ['$lt', [1, 2]];
          return testCase(o, true, ctx);
        });

        it('/simple check 2 < 1 = false', () => {
          let o = ['$lt', [2, 1]];
          return testCase(o, false, ctx);
        });
      });

      /**
       * ==================================================
       * match operation tests
       * ==================================================
       */
      describe('/match', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          // ctx = {'#lc_url': 'https://amazon.com/basket'};
          prefRetVal = {};
        });

        it('/invalid args call', () => {
          let o = ['$match', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$match', ['sadasd']];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check doesnt match', () => {
          ctx = {'#lc_url': 'https://amazon.com/basket'};
          let o = ['$match', ['https://amazon.com/basket', 'amazon.de/basket']];
          return testCase(o, false, ctx);
        });

        it('/simple check matches', () => {
          ctx = {'#lc_url': 'https://amazon.de/basket'};
          let o = ['$match', ['https://amazon.de/basket', 'amazon.de/basket']];
          return testCase(o, true, ctx);
        });

        it('/simple check matches in the third position', () => {
          ctx = {'#lc_url': 'https://amazon.com/basket'};
          let o = ['$match', ['https://amazon.com/basket', 'amazon.de/basket', 'amazon.de', 'amazon.com']];
          return testCase(o, true, ctx);
        });
      });

      /**
       * ==================================================
       * timestamp operation tests
       * ==================================================
       */
      describe('/timestamp', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/simple check', () => {
          let o = ['$timestamp'];
          currentTS = 123;
          return testCase(o, 123, ctx);
        });
      });

      /**
       * ==================================================
       * day_hour operation tests
       * ==================================================
       */
      describe('/day_hour', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/simple check', () => {
          let o = ['$day_hour'];
          currentDayHour = 3;
          return testCase(o, 3, ctx);
        });
      });

      /**
       * ==================================================
       * week_day operation tests
       * ==================================================
       */
      describe('/week_day', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        it('/simple check', () => {
          let o = ['$week_day'];
          currentWeekDay = 1;
          return testCase(o, 1, ctx);
        });
      });

      /**
       * ==================================================
       * query_match operation tests
       * ==================================================
       */
      describe('/match_query', () => {
        let op;
        let ctx;

        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
        });

        const testArgs = [{
          keywords_list: [{
            keywords: ['test'],
            filter: [],
          }]
        }];

        it('/simple checks query_info is valid', () => {
          ctx = { '#query_info': { query: 'test', origin: 'google.de' } };
          let o = ['$match_query', testArgs];
          return testCase(o, true, ctx);
        });

        const testArgs2 = [{
          keywords_list: [{
            keywords: ['test'],
            filter: [],
          }]
        }];

        it('/simple checks no query_info', () => {
          ctx = { '#queryinfo': { query: 'test', origin: 'google.de' } };
          let o = ['$match_query', testArgs2];
          return testCase(o, false, ctx);
        });

        const testArgs3 = [{
          no_keywords_list: [{
            keywords: ['test'],
            filter: [],
          }]
        }];

        it('/simple checks no keywords', () => {
          ctx = { '#query_info': { query: 'test', origin: 'google.de' } };
          let o = ['$match_query', testArgs3];
          return testCase(o, false, ctx).catch(err => {
            chai.expect(err).to.exist;
          });
        });

      });

    });
  },
);
