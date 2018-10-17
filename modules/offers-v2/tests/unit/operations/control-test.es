/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style, no-param-reassign */

const tldts = require('tldts');

let prefRetVal = {};
let currentTS = Date.now();
let currentDayHour = 0;
let currentWeekDay = 0;
let platformLaguage;

const DAY_MS = 1000 * 60 * 60 * 24;

const getDaysFromTimeRange = (start, end) => {
  const result = [];
  while (start <= end) {
    result.push(`${Math.floor(start / DAY_MS)}`);
    start += DAY_MS;
  }
  return result;
};
const getTodayDayKey = timeMs => `${Math.floor((timeMs / DAY_MS))}`;

export default describeModule('offers-v2/trigger_machine/ops/control_expr',
  () => ({
    'core/platform': {
      isWebExtension: false
    },
    'platform/lib/tldts': tldts,
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
      timestampMS: function () {
        return currentTS;
      },
      dayHour: function () {
        return currentDayHour;
      },
      weekDay: function () {
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
        get: function (prefName, defaultVal) {
          if (prefRetVal) {
            return prefRetVal;
          }
          return defaultVal;
        },
        setMockVal: function (varName, val) {
          prefRetVal[varName] = val;
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
    'core/utils': {
      default: {},
    },
    'platform/console': {
      default: {},
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: (...args) => { console.error(...args); },
        info: (...args) => { console.log(args); },
        log: () => {},
        warn: (...args) => { console.error(...args); },
        logObject: () => {},
      }
    },
    'core/helpers/timeout': {
      default: function () { const stop = () => {}; return { stop }; }
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
    'offers-v2/features/feature-handler': {
      default: class {
        constructor() {
          this.features = {};
        }
        clear() {
          this.features = {};
        }
        addFeaturesToCheck() {}

        isFeatureAvailable(featureName) {
          return !!this.features[featureName];
        }
        getFeature(featureName) {
          return this.features[featureName];
        }
        dumpFeaturesData() {}
      }
    },
    'core/time': {
      getDaysFromTimeRange: function (startTS, endTS) {
        return getDaysFromTimeRange(startTS, endTS);
      },
      getDateFromDateKey: function (dateKey) {
        return `${Number(dateKey) * DAY_MS}`;
      },
      timestamp: function () {},
      getTodayDayKey: function () {
        return getTodayDayKey();
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
          console.log('### HEREE', query);
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
    'offers-v2/features/geo_checker': {
      default: class {
        constructor() {
          this.clear();
        }
        clear() {
          this.locs = null;
          this.lastLocCheck = [];
          this.isSameLocationRet = true;
        }
        isLocAvailable() {
          return this.loc !== null;
        }
        isAvailable() {
          return this.isLocAvailable();
        }
        updateLocation() { }
        updateCity() { }
        updateCountry() { }
        checkLocByCoords() {
          // TODO: implement this when required
          return false;
        }
        isSameLocation(loc) {
          this.lastLocCheck.push(loc);
          return this.isSameLocationRet;
        }
      }
    }
  }),
  () => {
    describe('/control operations', () => {
      let buildDataGen;
      let ExpressionBuilder;
      let exprBuilder;
      let RegexpCache;
      let QHandlerMock;
      let FeatureHandler;
      let GeoCheckerMock;
      let geoMock;
      let featureHandlerMock;
      let patternMatchMock;

      function buildOp(obj) {
        return exprBuilder.createExp(obj);
      }

      function testCase(op, expectedVal, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).eql(expectedVal);
        });
      }

      beforeEach(function () {
        RegexpCache = this.deps('offers-v2/regexp_cache').default;
        QHandlerMock = this.deps('offers-v2/query_handler').default;
        FeatureHandler = this.deps('offers-v2/features/feature-handler').default;
        GeoCheckerMock = this.deps('offers-v2/features/geo_checker').default;
        const PatternMatchingHandlerMock = this.deps('offers-v2/pattern-matching/pattern-matching-handler').default;
        patternMatchMock = new PatternMatchingHandlerMock();
        featureHandlerMock = new FeatureHandler();
        geoMock = new GeoCheckerMock();
        prefRetVal = {};
        buildDataGen = {
          regex_cache: new RegexpCache(),
          query_handler: new QHandlerMock(),
          geo_checker: geoMock,
          feature_handler: featureHandlerMock,
          pattern_matching_handler: patternMatchMock,
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
          prefRetVal = true;
          return testCase(o, false, ctx);
        });

        it('/simple checks exists and same value', () => {
          const o = ['$if_pref', ['test_pref', false]];
          prefRetVal = false;
          return testCase(o, false, ctx);
        });

        it('/simple checks not exists string', () => {
          const o = ['$if_pref', ['test_pref_str', 'value1']];
          prefRetVal = true;
          return testCase(o, false, ctx);
        });

        it('/simple checks exists string different value', () => {
          const o = ['$if_pref', ['test_pref_str', 'value1']];
          prefRetVal = 'value2';
          return testCase(o, false, ctx);
        });

        it('/simple checks exists string same value', () => {
          const o = ['$if_pref', ['test_pref_str', 'value1']];
          prefRetVal = 'value1';
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
          prefRetVal = {};
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
          prefRetVal = {};
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
          prefRetVal = {};
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
          prefRetVal = {};
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
          prefRetVal = {};
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
          prefRetVal = {};
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
          prefRetVal = {};
        });

        it('/simple check', () => {
          const o = ['$timestamp'];
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
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
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
          prefRetVal = {};
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
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          featureHandlerMock.clear();
        });

        it('/invalid args call', () => {
          const o = ['$is_feature_enabled', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = ['$is_feature_enabled', [{}]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check feature doesnt exists', () => {
          const o = ['$is_feature_enabled', [{ name: 'feature_test_not_exists' }]];
          featureHandlerMock.features = { feature_test: false };
          return testCase(o, false, ctx);
        });

        it('/simple check feature exists but dissabled', () => {
          const o = ['$is_feature_enabled', [{ name: 'feature_test' }]];
          featureHandlerMock.features = { feature_test: false };
          return testCase(o, false, ctx);
        });

        it('/simple check feature exists and enabled', () => {
          const o = ['$is_feature_enabled', [{ name: 'feature_test' }]];
          featureHandlerMock.features = { feature_test: true, feature_test_2: false };
          return testCase(o, true, ctx);
        });
      });

      /**
       * ==================================================
       * geo_check operation tests
       * ==================================================
       */
      describe('/geo_check', () => {
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          geoMock.clear();
          featureHandlerMock.clear();
        });

        it('/missing arguments 1', () => {
          const o = ['$geo_check'];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 2', () => {
          const args = [];
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 3', () => {
          const args = [{}];
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 4', () => {
          const args = [{ coords: {} }];
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 5', () => {
          const args = [{ locs: {} }];
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 6', () => {
          const args = [{ coords: {}, main_check: 'locs' }];
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 7', () => {
          const args = [{ locs: {}, main_check: 'coords' }];
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 8', () => {
          const args = [{ coords: {}, locs: {}, main_check: 'whatever' }];
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).catch((err) => {
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

          geoMock.isSameLocationRet = true;
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, true, ctx).then(() => {
            const expected = { country: 'de', city: 'munich', zip: '123' };
            chai.expect(geoMock.lastLocCheck).eql([expected]);
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

          geoMock.isSameLocationRet = true;
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, true, ctx).then(() => {
            const expected = [
              { country: 'de', city: 'munich', zip: '123' }
            ];
            chai.expect(geoMock.lastLocCheck).eql(expected);
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

          geoMock.isSameLocationRet = false;
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).then(() => {
            const expected = [
              { country: 'de', city: 'berlin', zip: '456' },
              { country: 'de', city: 'berlin', zip: '8989' },
              { country: 'de', city: 'munich', zip: '123' },
              { country: 'de', city: 'munich', zip: '234' },
              { country: 'de', city: 'munich', zip: '456' }
            ];
            chai.expect(geoMock.lastLocCheck).eql(expected);
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

          geoMock.isSameLocationRet = false;
          const o = ['$geo_check', args];
          featureHandlerMock.features = { geo: geoMock };
          return testCase(o, false, ctx).then(() => {
            const expected = [
              { country: 'de', city: 'berlin' },
              { country: 'de', city: 'munich' },
            ];
            chai.expect(geoMock.lastLocCheck).eql(expected);
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

          const o = ['$geo_check', args];
          featureHandlerMock.features = {};
          return testCase(o, false, ctx);
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
          prefRetVal = {};
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
    });
  },
);
