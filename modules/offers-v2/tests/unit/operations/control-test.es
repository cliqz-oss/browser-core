/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style, no-param-reassign */

const MockDate = require('mockdate');
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');

const prefs = commonMocks['core/prefs'].default;
// eslint-disable-next-line new-cap
const db = new (persistenceMocks['core/persistence/simple-db'].default)();

let currentDayHour = 0;
let currentWeekDay = 0;
let platformLaguage;

async function getEmptyCategoryHandler(system, historyFeature, dbmock, oldCategoryHandler) {
  let ch = oldCategoryHandler;
  if (!ch) {
    const CategoryHandler = (await system.import('offers-v2/categories/category-handler')).default;
    ch = new CategoryHandler(historyFeature);
    await ch.init(dbmock);
  }
  ch.catTree.clear();
  return ch;
}

export default describeModule('offers-v2/trigger_machine/ops/control_expr',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    'core/http': {
      default: {}
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
    'platform/environment': {
      default: {}
    },
    'offers-v2/utils': {
      timestampMS: function () {
        return Date.now();
      },
      dayHour: function () {
        return currentDayHour;
      },
      weekDay: function () {
        return currentWeekDay;
      }
    },
    'offers-v2/regexp_cache': {
      default: class {
        getRegexp(p) {
          return new RegExp(p);
        }
      }
    },
    'core/i18n': {
      default: {
        get PLATFORM_LANGUAGE() {
          return platformLaguage;
        },
      },
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
    'offers-v2/pattern-matching/pattern-matching-handler': {
      default: class {
        constructor() {
          this.clear();
        }

        setitMatchesResult(r) { this.itMatchesResult = r; }

        itMatches(tokenizedURL, patternObj) {
          this.lastTokenizedURL = tokenizedURL;
          this.lastPatternObj = patternObj;
          return this.itMatchesResult;
        }

        countHistoryMatches(query, patternObj) {
          this.lastQuery = query;
          this.lastPatternObj = patternObj;
          return this.countHistoryMatchesResult;
        }

        clear() {
          this.lastTokenizedURL = null;
          this.lastPatternObj = null;
          this.lastQuery = null;
          this.itMatchesResult = false;
          this.countHistoryMatchesResult = 0;
        }
      }
    },
    'offers-v2/common/url_data': {
      default: class {
        constructor(url) {
          this.rawUrl = url;
        }

        hasReferrer() { return false; }

        getReferrer() { return ''; }

        getRawUrl() { return this.rawUrl; }

        getNormalizedUrl() { return decodeURIComponent(this.rawUrl.replace(/\+/g, '%20')).toLowerCase(); }

        getUrlDetails() { return {}; }

        getDomain() { return ''; }

        getPatternRequest() { return this.rawUrl; }
      }
    },
  }),
  () => {
    describe('/control operations', () => {
      let buildDataGen;
      let ExpressionBuilder;
      let categoryHandler;
      let exprBuilder;
      let RegexpCache;
      let QHandlerMock;
      let FeatureHandler;
      let featureHandler;
      let patternMatchMock;
      let Category;
      let historyFeature;
      let isThrottleError;

      function buildOp(obj) {
        return exprBuilder.createExp(obj);
      }

      function testCase(op, expectedVal, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).eql(expectedVal);
        });
      }

      beforeEach(async function () {
        RegexpCache = this.deps('offers-v2/regexp_cache').default;
        QHandlerMock = this.deps('offers-v2/query_handler').default;
        FeatureHandler = (await this.system.import('offers-v2/features/feature-handler')).default;
        const PatternMatchingHandlerMock = this.deps('offers-v2/pattern-matching/pattern-matching-handler').default;
        patternMatchMock = new PatternMatchingHandlerMock();
        featureHandler = new FeatureHandler();
        prefs.reset();
        historyFeature = historyFeature || featureHandler.getFeature('history');
        categoryHandler = await getEmptyCategoryHandler(
          this.system, historyFeature, db, categoryHandler
        );
        Category = (await this.system.import('offers-v2/categories/category')).default;
        buildDataGen = {
          regex_cache: new RegexpCache(),
          query_handler: new QHandlerMock(),
          feature_handler: featureHandler,
          pattern_matching_handler: patternMatchMock,
          category_handler: categoryHandler,
        };
        isThrottleError = (await this.system.import('offers-v2/common/throttle-with-rejection')).isThrottleError;
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
          const o = ['$if_pref', ['test_pref', false]];
          prefs.set('test_pref', true);
          return testCase(o, false, ctx);
        });

        it('/simple checks exists and same value', () => {
          const o = ['$if_pref', ['test_pref', false]];
          prefs.set('test_pref', false);
          return testCase(o, true, ctx);
        });

        it('/simple checks not exists string', () => {
          const o = ['$if_pref', ['test_pref_str', 'value1']];
          prefs.set('test_pref_str', true);
          return testCase(o, false, ctx);
        });

        it('/simple checks exists string different value', () => {
          const o = ['$if_pref', ['test_pref_str', 'value1']];
          prefs.set('test_pref_str', 'value2');
          return testCase(o, false, ctx);
        });

        it('/simple checks exists string same value', () => {
          const o = ['$if_pref', ['test_pref_str', 'value1']];
          prefs.set('test_pref_str', 'value1');
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
          prefs.reset();
        });

        it('/invalid args call', () => {
          const o = ['$log', []];
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
          prefs.reset();
        });

        it('/invalid args call', () => {
          const o = ['$and', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = ['$and', [true]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check true', () => {
          const o = ['$and', [true]];
          return testCase(o, true, ctx);
        });

        it('/simple check true true = true', () => {
          const o = ['$and', [true, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check true false = false', () => {
          const o = ['$and', [true, false]];
          return testCase(o, false, ctx);
        });

        it('/simple check false true true = false', () => {
          const o = ['$and', [false, true, true]];
          return testCase(o, false, ctx);
        });

        it('/simple check true true true false = false', () => {
          const o = ['$and', [true, true, true, false]];
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
          prefs.reset();
        });

        it('/invalid args call', () => {
          const o = ['$or', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = ['$or', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 3', () => {
          const o = ['$or', [true]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check true true = true', () => {
          const o = ['$or', [true, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check true false = true', () => {
          const o = ['$or', [true, false]];
          return testCase(o, true, ctx);
        });

        it('/simple check false true = true', () => {
          const o = ['$or', [false, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check false false false true = true', () => {
          const o = ['$or', [false, false, false, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check false false false false = false', () => {
          const o = ['$or', [false, false, false, false]];
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
          prefs.reset();
        });

        it('/invalid args call', () => {
          const o = ['$not', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call', () => {
          const o = ['$not', [true, false]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check false = true', () => {
          const o = ['$not', [false]];
          return testCase(o, true, ctx);
        });

        it('/simple check true = false', () => {
          const o = ['$not', [true]];
          return testCase(o, false, ctx);
        });

        it('/simple check false = true', () => {
          const o = ['$not', [false]];
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
          prefs.reset();
        });

        it('/invalid args call', () => {
          const o = ['$eq', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = ['$eq', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check true true = true', () => {
          const o = ['$eq', [true, true]];
          return testCase(o, true, ctx);
        });

        it('/simple check true false = false', () => {
          const o = ['$eq', [true, false]];
          return testCase(o, false, ctx);
        });

        it('/simple check 1 1 = true', () => {
          const o = ['$eq', [1, 1]];
          return testCase(o, true, ctx);
        });

        it('/simple check asd asd = true', () => {
          const o = ['$eq', ['asd', 'asd']];
          return testCase(o, true, ctx);
        });

        it('/simple check asd true = false', () => {
          const o = ['$eq', ['asd', true]];
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
          prefs.reset();
        });

        it('/invalid args call', () => {
          const o = ['$gt', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = ['$gt', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check 1 > 1 = false', () => {
          const o = ['$gt', [1, 1]];
          return testCase(o, false, ctx);
        });

        it('/simple check 1 > 2 = false', () => {
          const o = ['$gt', [1, 2]];
          return testCase(o, false, ctx);
        });

        it('/simple check 2 > 1 = true', () => {
          const o = ['$gt', [2, 1]];
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
          prefs.reset();
        });

        it('/invalid args call', () => {
          const o = ['$lt', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = ['$lt', [1]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check 1 < 1 = false', () => {
          const o = ['$gt', [1, 1]];
          return testCase(o, false, ctx);
        });

        it('/simple check 1 < 2 = true', () => {
          const o = ['$lt', [1, 2]];
          return testCase(o, true, ctx);
        });

        it('/simple check 2 < 1 = false', () => {
          const o = ['$lt', [2, 1]];
          return testCase(o, false, ctx);
        });
      });

      /**
       * ==================================================
       * timestamp operation tests
       * ==================================================
       */
      describe('/timestamp', () => {
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefs.reset();
        });

        afterEach(function () {
          MockDate.reset();
        });

        it('/simple check', () => {
          const o = ['$timestamp'];
          MockDate.set(123);
          return testCase(o, 123, ctx);
        });
      });

      /**
       * ==================================================
       * day_hour operation tests
       * ==================================================
       */
      describe('/day_hour', () => {
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefs.reset();
        });

        it('/simple check', () => {
          const o = ['$day_hour'];
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
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefs.reset();
        });

        it('/simple check', () => {
          const o = ['$week_day'];
          currentWeekDay = 1;
          return testCase(o, 1, ctx);
        });
      });

      //  *
      //  * ==================================================
      //  * is_feature_enabled operation
      //  * ==================================================

      describe('/is_feature_enabled', () => {
        let isFeatureAvailableMock;

        beforeEach(function () {
          isFeatureAvailableMock = sinon.stub(featureHandler, 'isFeatureAvailable');
        });

        afterEach(function () {
          isFeatureAvailableMock.restore();
        });

        it('/invalid args call', () => {
          const o = ['$is_feature_enabled', []];
          const op = buildOp(o);
          return op.evalExpr({}).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = ['$is_feature_enabled', [{}]];
          const op = buildOp(o);
          return op.evalExpr({}).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check feature doesnt exists', () => {
          const o = ['$is_feature_enabled', [{ name: 'feature_test_not_exists' }]];
          isFeatureAvailableMock.callThrough();
          return testCase(o, false, {});
        });

        it('/simple check feature exists but disabled', async () => {
          const o = ['$is_feature_enabled', [{ name: 'feature_test' }]];
          isFeatureAvailableMock.returns(false);
          await testCase(o, false, {});
          chai.expect(isFeatureAvailableMock.firstCall.args).is.eql(['feature_test']);
        });

        it('/simple check feature exists and enabled', async () => {
          const o = ['$is_feature_enabled', [{ name: 'feature_test' }]];
          isFeatureAvailableMock.returns(true);
          await testCase(o, true, {});
          chai.expect(isFeatureAvailableMock.firstCall.args).is.eql(['feature_test']);
        });
      });

      /**
       * ==================================================
       * geo_check operation tests
       * ==================================================
       */
      describe('/geo_check', () => {
        let isAvailableMock;
        let isLocAvailableMock;
        let isSameLocationMock;

        beforeEach(function () {
          const geoFeature = featureHandler.features.get('geo');
          isAvailableMock = sinon.stub(geoFeature, 'isAvailable');
          isAvailableMock.returns(true);
          isLocAvailableMock = sinon.stub(geoFeature, 'isLocAvailable');
          isLocAvailableMock.returns(true);
          isSameLocationMock = sinon.stub(geoFeature, 'isSameLocation');
        });

        afterEach(function () {
          isAvailableMock.restore();
          isLocAvailableMock.restore();
          isSameLocationMock.restore();
        });

        it('/missing arguments 1', () => {
          const o = ['$geo_check'];
          return testCase(o, false, {}).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 2', () => {
          const args = [];
          const o = ['$geo_check', args];
          return testCase(o, false, {}).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 3', () => {
          const args = [{}];
          const o = ['$geo_check', args];
          return testCase(o, false, {}).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 4', () => {
          const args = [{ coords: {} }];
          const o = ['$geo_check', args];
          return testCase(o, false, {}).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 5', () => {
          const args = [{ locs: {} }];
          const o = ['$geo_check', args];
          return testCase(o, false, {}).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 6', () => {
          const args = [{ coords: {}, main_check: 'locs' }];
          const o = ['$geo_check', args];
          return testCase(o, false, {}).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 7', () => {
          const args = [{ locs: {}, main_check: 'coords' }];
          const o = ['$geo_check', args];
          return testCase(o, false, {}).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 8', () => {
          const args = [{ coords: {}, locs: {}, main_check: 'whatever' }];
          const o = ['$geo_check', args];
          return testCase(o, false, {}).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/locs works for 1', () => {
          const args = [{
            locs: {
              de: {
                munich: ['123']
              }
            },
            main_check: 'locs'
          }];

          isSameLocationMock.returns(true);
          const o = ['$geo_check', args];
          return testCase(o, true, {}).then(() => {
            const expected = { country: 'de', city: 'munich', zip: '123' };
            chai.expect(isSameLocationMock.lastCall.args).eql([expected]);
          });
        });

        it('/we only check one if first match', () => {
          const args = [{
            locs: {
              de: {
                munich: ['123', '234', '456']
              }
            },
            main_check: 'locs'
          }];

          isSameLocationMock.returns(true);
          const o = ['$geo_check', args];
          return testCase(o, true, {}).then(() => {
            const expected = [
              { country: 'de', city: 'munich', zip: '123' }
            ];
            chai.expect(isSameLocationMock.lastCall.args).eql(expected);
          });
        });

        it('/we multiple if none match', () => {
          const args = [{
            locs: {
              de: {
                berlin: ['456', '8989'],
                munich: ['123', '234', '456']
              }
            },
            main_check: 'locs'
          }];

          isSameLocationMock.returns(false);
          const o = ['$geo_check', args];
          return testCase(o, false, {}).then(() => {
            const expected = [
              { country: 'de', city: 'berlin', zip: '456' },
              { country: 'de', city: 'berlin', zip: '8989' },
              { country: 'de', city: 'munich', zip: '123' },
              { country: 'de', city: 'munich', zip: '234' },
              { country: 'de', city: 'munich', zip: '456' }
            ];
            const locChecks = Array.from(isSameLocationMock.args, a => a[0]);
            chai.expect(locChecks).eql(expected);
          });
        });

        it('/check city works', () => {
          const args = [{
            locs: {
              de: {
                berlin: [],
                munich: null,
              }
            },
            main_check: 'locs'
          }];

          isSameLocationMock.returns(false);
          const o = ['$geo_check', args];
          return testCase(o, false, {}).then(() => {
            const expected = [
              { country: 'de', city: 'berlin' },
              { country: 'de', city: 'munich' },
            ];
            const locChecks = Array.from(isSameLocationMock.args, a => a[0]);
            chai.expect(locChecks).eql(expected);
          });
        });

        it('/feature disabled works', () => {
          const args = [{
            locs: {
              de: {
                munich: ['123', '234', '456']
              }
            },
            main_check: 'locs'
          }];

          isAvailableMock.returns(false);
          const o = ['$geo_check', args];
          return testCase(o, false, {});
        });
      });

      /**
       * ==================================================
       * $lang_is operation tests
       * ==================================================
       */
      describe('/lang_is', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefs.reset();
        });

        it('/invalid args call', () => {
          const o = [
            '$lang_is',
            [
              'not a language',
              123456
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
            '$lang_is',
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

        it('/language in the list', () => {
          const o = [
            '$lang_is',
            [
              'en',
              'de',
              'fr'
            ]
          ];
          platformLaguage = 'de';
          return testCase(o, true, ctx);
        });

        it('/language not in the list', () => {
          const o = [
            '$lang_is',
            [
              'en',
              'de',
              'fr'
            ]
          ];
          platformLaguage = 'es';
          return testCase(o, false, ctx);
        });
      });

      // ==
      // $get_variable
      //
      describe('$get_variable', () => {
        function buildOpGetSomeVar(o = ['$get_variable', ['someVar']]) {
          const op = buildOp(o);
          op.build();
          return op;
        }

        it('/parse ok', () => {
          const op = buildOpGetSomeVar();

          chai.expect(op.varName).to.eq('someVar');
        });

        it('/error on bad argument', () => {
          const o = ['$get_variable'];

          chai.expect(
            () => buildOp(o)
          ).to.throw();
        });

        it('/get value of existing variable', async () => {
          const op = buildOpGetSomeVar();

          const value = await op.evalExpr({ vars: { someVar: 777 } });

          chai.expect(value).to.eq(777);
        });

        it('/return "undefined" for a non-existent variable', async () => {
          const op = buildOpGetSomeVar();

          const value = await op.evalExpr({ novars: {} });

          chai.expect(value).to.be.undefined;
        });

        it('/support default value', async () => {
          const op = buildOpGetSomeVar(['$get_variable', ['someVar', 777]]);

          const value = await op.evalExpr({ novars: {} });

          chai.expect(value).to.eq(777);
        });
      });

      // ==
      // $probe_segment
      //
      describe('$probe_segment', () => {
        const defaultDuration = 90;
        const defaultMinMatches = 3;
        const ctx = { };

        context('/parsing', () => {
          it('/sets values', () => {
            const o = ['$probe_segment',
              ['someCategory', {
                min_matches: 777,
                duration_days: 888
              }]];
            const op = buildOp(o);

            op.build();

            chai.expect(op.categoryName).to.eq('someCategory');
            chai.expect(op.minMatches).to.eq(777);
            chai.expect(op.durationDays).to.eq(888);
          });

          function failOnBadCategoryArgument(explain, categoryArg) {
            it(`/fail on bad category: ${explain}`, () => {
              const o = ['$probe_segment', categoryArg];
              const op = buildOp(o);

              chai.expect(
                () => op.build()
              ).to.throw(
                explain
              );
            });
          }

          failOnBadCategoryArgument('missed category arg');
          failOnBadCategoryArgument('should be a string', 1234);

          function defaultOnBadFilterArgument(explain, filterArg) {
            it(`/default on bad filter: ${explain}`, () => {
              const o = ['$probe_segment', ['someCategory', filterArg]];
              const op = buildOp(o);

              op.build();

              chai.expect(op.minMatches).to.eq(defaultMinMatches);
              chai.expect(op.durationDays).to.eq(defaultDuration);
            });
          }

          defaultOnBadFilterArgument('no argument', undefined);
          defaultOnBadFilterArgument('not a map', 12345);
          defaultOnBadFilterArgument('not integers', { min_matches: 'nan', duration_days: 'nan' });
          defaultOnBadFilterArgument('not positive', { min_matches: -2, duration_days: -8 });
        });

        function setupEnvironmentWithCategory() {
          const o = ['$probe_segment',
            ['someCategory', {
              min_matches: 77,
              duration_days: 88
            }]];
          const op = buildOp(o);
          const category = new Category('someCategory', /* patterns */ [], /* version */ 1);
          const pmock = sinon.stub(category, 'probe');
          categoryHandler.addCategory(category);
          ctx.vars = { segment_confidence: 777 };
          return { op, category, probeMock: pmock };
        }

        context('/communicate with Category', () => {
          let category;
          let probeMock;
          let op;

          beforeEach(() => {
            ({ category, probeMock, op } = setupEnvironmentWithCategory());
            probeMock.callThrough();
            categoryHandler._resetHistoryThrottle();
          });

          it('/pass parameters to category', async () => {
            await op.evalExpr(ctx);

            chai.expect(probeMock).calledWithExactly(77, 88);
          });

          it('/return (false, sure) if no category', async () => {
            categoryHandler.removeCategory(category);

            const isMatched = await op.evalExpr(ctx);
            const confidence = ctx.vars.segment_confidence;

            chai.expect(isMatched).to.be.false;
            chai.expect(confidence).to.eq(1);
          });

          it('/return value from Category::probe', async () => {
            probeMock.reset();
            probeMock.returns(['true/false', false]);

            const isMatched = await op.evalExpr(ctx);

            chai.expect(isMatched).to.eql('true/false');
          });

          it('/set maybe-flag as given by Category::probe', async () => {
            probeMock.reset();
            probeMock.returns(['true/false', 0.222]);

            await op.evalExpr(ctx);

            chai.expect(ctx.vars.segment_confidence).to.eql(0.222);
          });

          it('/call `probe` second time if history loaded fast', async () => {
            probeMock.reset();
            probeMock.onCall(0).returns([false, 0]); // not matched, maybe
            probeMock.onCall(1).returns(['from second call', 1]); // matched, sure

            const isMatched = await op.evalExpr(ctx);

            chai.expect(isMatched).to.eql('from second call');
            chai.expect(probeMock.callCount).to.eq(2);
          });

          context('/caching', () => {
            beforeEach(() => {
              category.updateWithHistoryData({ per_day: [] }); // make confidence=1
              ctx.vars = {};
            });

            it('/caches calls', async () => {
              await op.evalExpr(ctx);
              await op.evalExpr(ctx);
              await op.evalExpr(ctx);

              sinon.assert.calledOnce(probeMock);
            });

            it('/do not cache if the cache sentinel is changed', async () => {
              await op.evalExpr(ctx);
              category.hit();

              await op.evalExpr(ctx);

              sinon.assert.calledTwice(probeMock);
            });

            it('/do not cache in case of `maybe`', async () => {
              probeMock.reset();
              probeMock.returns(['true/false', 0]);

              await op.evalExpr(ctx);
              await op.evalExpr(ctx);
              await op.evalExpr(ctx);

              // 2 calls in first `evalExpr`, 1 call in the rest
              chai.expect(probeMock.callCount).is.eq(4);
            });
          });
        });

        context('/communicate with History', () => {
          let probeMock;
          let historyMock;
          let op;

          beforeEach(() => {
            ({ probeMock, op } = setupEnvironmentWithCategory());
            historyMock = sinon.stub(historyFeature, 'performQueryOnHistory');
            historyMock.returns({ pid: 'someCategory|1', d: { match_data: { total: 0, per_day: {} } } });
            categoryHandler._resetHistoryThrottle();
          });

          afterEach(() => {
            historyMock.restore();
          });

          it('/load history', async () => {
            probeMock.returns([false, 0]); // [!matched, maybe]

            await op.evalExpr(ctx);

            sinon.assert.called(historyMock); //
          });

          it('/use time range from the category', async () => {
            const cat = categoryHandler.getCategory('someCategory');
            cat.timeRangeSecs = 777;
            probeMock.returns([false, 0]); // [!matched, maybe]

            await op.evalExpr(ctx);

            sinon.assert.calledOnce(historyMock);
            const { start_ms: startMs, end_ms: endMs } = historyMock.firstCall.args[0];
            chai.expect(endMs).to.be.within(Date.now() - 10 * 1000, Date.now());
            chai.expect(endMs - startMs).to.be.closeTo(777 * 1000, 3 * 1000);
          });

          it('/do not load history if the result is for sure', async () => {
            probeMock.returns([false, 1]); // [!matched, sure]

            await op.evalExpr(ctx);

            sinon.assert.notCalled(historyMock);
          });

          it('/propagate error from history query', async () => {
            probeMock.returns([false, 0]); // [!matched, maybe]
            historyMock.throws(new Error('intended to fail'));

            await chai.expect(
              op.evalExpr(ctx)
            )

              .to.be.eventually.rejectedWith('intended to fail');
          });

          it('/ignore throttling error', async () => {
            probeMock.returns([false, 0]); // [!matched, maybe]
            historyMock.returns({ pid: 'someCategory|1', d: { match_data: { total: 0, per_day: {} } } });

            //
            // Preliminary test: throttling exception is been raising
            //
            // Arrange
            const cat = categoryHandler.getCategory('someCategory');
            await categoryHandler.importHistoricalData(cat);
            await chai.expect(
              categoryHandler.importHistoricalData(cat)
            )

              .to.be.eventually.rejectedWith(Error)
              .that.satisfies(isThrottleError);

            //
            // Main test
            //

            // Act
            await op.evalExpr(ctx);

            // Assert: no exception raised
          });
        });
      });
    });
  });
