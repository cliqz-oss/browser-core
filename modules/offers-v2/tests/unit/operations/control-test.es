/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */


var prefRetVal = {};
var currentTS = Date.now();
var currentDayHour = 0;
var currentWeekDay = 0;
let hookedResultOfLoggerInfo;


const DAY_MS = 1000 * 60 * 60 * 24;

const getDaysFromTimeRange = (start, end) => {
  const result = [];
  while (start <= end) {
    result.push(`${Math.floor(start/DAY_MS)}`);
    start += DAY_MS;
  }
  return result;
};
const getTodayDayKey = timeMs => `${Math.floor((timeMs / DAY_MS))}`;

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
        error: (...args) => {console.error(...args)},
        info: (...args) => { console.log(args); hookedResultOfLoggerInfo = args; },
        log: () => {},
        warn: () => { console.error(...args); },
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
    'offers-v2/features/feature-handler': {
      default: class {
        constructor() {
          this.features = {};
        }
        clear() {
          this.features = {};
        }
        addFeaturesToCheck(featureList) {}

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
      getDaysFromTimeRange: function(startTS, endTS) {
        return getDaysFromTimeRange(startTS, endTS);
      },
      getDateFromDateKey: function(dateKey, hours = 0, min = 0, seconds = 0) {
        return `${Number(dateKey) * DAY_MS}`;
      },
      timestamp: function() {
        return mockedTS;
      },
      getTodayDayKey: function() {
        return getTodayDayKey(mockedTS);
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
        getLowercaseUrl() { return this.rawUrl.toLowerCase() ;}
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
        updateLocation(data) { }
        updateCity(city) { }
        updateCountry(country) { }
        checkLocByCoords(coords, dKm) {
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
      let ops;
      let eventLoop;
      let buildDataGen;
      let prefMock;
      let ExpressionBuilder;
      let exprBuilder;
      let RegexpCache;
      let QHandlerMock;
      let FeatureHandler;
      let GeoCheckerMock;
      let geoMock;
      let featureHandlerMock;
      let patternMatchMock;
      let UrlData;

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
        ops = this.module().default;
        prefMock = this.deps('core/prefs').default;
        RegexpCache = this.deps('offers-v2/regexp_cache').default;
        QHandlerMock = this.deps('offers-v2/query_handler').default;
        FeatureHandler = this.deps('offers-v2/features/feature-handler').default;
        GeoCheckerMock = this.deps('offers-v2/features/geo_checker').default;
        const PatternMatchingHandlerMock = this.deps('offers-v2/pattern-matching/pattern-matching-handler').default;
        UrlData = this.deps('offers-v2/common/url_data').default;
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
          let o = ['$is_feature_enabled', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          let o = ['$is_feature_enabled', [{}]];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple check feature doesnt exists', () => {
          let o = ['$is_feature_enabled', [{name: 'feature_test_not_exists'}]];
          featureHandlerMock.features = {feature_test: false};
          return testCase(o, false, ctx);
        });

        it('/simple check feature exists but dissabled', () => {
          let o = ['$is_feature_enabled', [{name: 'feature_test'}]];
          featureHandlerMock.features = {feature_test: false};
          return testCase(o, false, ctx);
        });

        it('/simple check feature exists and enabled', () => {
          let o = ['$is_feature_enabled', [{name: 'feature_test'}]];
          featureHandlerMock.features = {feature_test: true, feature_test_2: false};
          return testCase(o, true, ctx);
        });

      });


      //  *
      //  * ==================================================
      //  * pattern_match operation
      //  * ==================================================

      describe('/pattern_match', () => {
        let op;
        let ctx;
        const SAMPLE_URL = 'http://www.amazon.com';

        beforeEach(function () {
          ctx = {
            '#url_data': new UrlData(SAMPLE_URL),
          };
          prefRetVal = {};
          featureHandlerMock.clear();
          patternMatchMock.clear();
        });

        function testInvalidArg(context, operation) {
          const op = buildOp(operation);
          return op.evalExpr(context).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        }

        it('/invalid args call', () => {
          let o = ['$pattern_match', []];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args call 2', () => {
          let o = ['$pattern_match', [{}]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for current url 1', () => {
          let o = ['$pattern_match', [{match_current: true}]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for current url 2', () => {
          const arg = {
            match_current: true,
            patterns: {},
          };
          let o = ['$pattern_match', [arg]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for current url 3', () => {
          const arg = {
            match_current: true,
            patterns: {
              pid: 'x',
            },
          };
          let o = ['$pattern_match', [arg]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for current url 4', () => {
          const arg = {
            match_current: true,
            patterns: {
              p_list: ['x']
            },
          };
          let o = ['$pattern_match', [arg]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for history 1', () => {
          let o = ['$pattern_match', [{match_current: false}]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for history 2', () => {
          const arg = {
            match_current: false,
            patterns: {},
          };
          let o = ['$pattern_match', [arg]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for history 3', () => {
          const arg = {
            match_current: false,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            },
          };
          let o = ['$pattern_match', [arg]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for history min_matches_expected > 0', () => {
          const arg = {
            match_current: false,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            },
            min_matches_expected: -1,
            till_secs: 4,
            since_secs: 19,
          };
          let o = ['$pattern_match', [arg]];
          return testInvalidArg(ctx, o);
        });

        it('/invalid args for history till_secs < since_secs', () => {
          const arg = {
            match_current: false,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            },
            min_matches_expected: 1,
            till_secs: 29,
            since_secs: 19,
          };
          let o = ['$pattern_match', [arg]];
          return testInvalidArg(ctx, o);
        });

        it('/simple test for current url true case', () => {
          const arg = {
            match_current: true,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            }
          };
          let o = ['$pattern_match', [arg]];
          patternMatchMock.setitMatchesResult(true);
          return testCase(o, true, ctx).then(() => {
            chai.expect(patternMatchMock.lastTokenizedURL).eql(SAMPLE_URL);
            chai.expect(patternMatchMock.lastPatternObj).eql(arg.patterns);
          });
        });

        it('/simple test for current url false acse', () => {
          const arg = {
            match_current: true,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            }
          };
          let o = ['$pattern_match', [arg]];
          patternMatchMock.setitMatchesResult(false);
          return testCase(o, false, ctx).then(() => {
            chai.expect(patternMatchMock.lastTokenizedURL).eql(SAMPLE_URL);
            chai.expect(patternMatchMock.lastPatternObj).eql(arg.patterns);
          });
        });

        // this.lastTokenizedURL = null;
        // this.lastPatternObj = null;
        // this.lastQuery = null;
        // this.itMatchesResult = false;
        // this.countHistoryMatchesResult = 0;

        // test some history
        it('/simple history case not reach minimum', () => {
          const arg = {
            match_current: false,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            },
            min_matches_expected: 1,
            till_secs: 10,
            since_secs: 19,
          };
          const expectedQuery = {
            since_secs: 19,
            till_secs: 10,
          };
          let o = ['$pattern_match', [arg]];
          patternMatchMock.countHistoryMatchesResult = 0;
          return testCase(o, false, ctx).then(() => {
            chai.expect(patternMatchMock.lastQuery).eql(expectedQuery);
            chai.expect(patternMatchMock.lastPatternObj).eql(arg.patterns);
          });
        });

        it('/simple history case reaches the minimum', () => {
          const arg = {
            match_current: false,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            },
            min_matches_expected: 1,
            till_secs: 10,
            since_secs: 19,
          };
          const expectedQuery = {
            since_secs: 19,
            till_secs: 10,
          };
          let o = ['$pattern_match', [arg]];
          patternMatchMock.countHistoryMatchesResult = 1;
          return testCase(o, true, ctx).then(() => {
            chai.expect(patternMatchMock.lastQuery).eql(expectedQuery);
            chai.expect(patternMatchMock.lastPatternObj).eql(arg.patterns);
          });
        });

        it('/simple history case reaches the minimum 2', () => {
          const arg = {
            match_current: false,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            },
            min_matches_expected: 1,
            till_secs: 10,
            since_secs: 19,
          };
          const expectedQuery = {
            since_secs: 19,
            till_secs: 10,
          };
          let o = ['$pattern_match', [arg]];
          patternMatchMock.countHistoryMatchesResult = 10;
          return testCase(o, true, ctx).then(() => {
            chai.expect(patternMatchMock.lastQuery).eql(expectedQuery);
            chai.expect(patternMatchMock.lastPatternObj).eql(arg.patterns);
          });
        });

        it('/simple history case cache works the minimum', () => {
          const arg = {
            match_current: false,
            patterns: {
              pid: 'x',
              p_list: [
                '||google.de'
              ],
            },
            cache_if_match_value_secs: 9999,
            min_matches_expected: 1,
            till_secs: 10,
            since_secs: 19,
          };
          const expectedQuery = {
            since_secs: 19,
            till_secs: 10,
          };
          let o = ['$pattern_match', [arg]];
          patternMatchMock.countHistoryMatchesResult = 1;
          const e = buildOp(o);
          return e.evalExpr(ctx).then((result) => {
            chai.expect(result).to.eq(true);

            chai.expect(patternMatchMock.lastQuery).eql(expectedQuery);
            chai.expect(patternMatchMock.lastPatternObj).eql(arg.patterns);
            patternMatchMock.countHistoryMatchesResult = 0;

            // still the value is cached
            patternMatchMock.lastQuery = null;
            patternMatchMock.lastPatternObj = null;
            return e.evalExpr(ctx).then((result) => {
              chai.expect(result).to.eq(true);
              chai.expect(patternMatchMock.lastPatternObj).eql(null);
              chai.expect(patternMatchMock.lastQuery).eql(null);
            });
          });
        });


      });

      /**
       * ==================================================
       * geo_check operation tests
       * ==================================================
       */
      describe('/geo_check', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          geoMock.clear();
          featureHandlerMock.clear();
        });

        it('/missing arguments 1', () => {
          let o = ['$geo_check'];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).catch(err => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 2', () => {
          const args = [];
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).catch(err => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 3', () => {
          const args = [{}];
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).catch(err => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 4', () => {
          const args = [{coords: {}}];
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).catch(err => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 5', () => {
          const args = [{locs: {}}];
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).catch(err => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 6', () => {
          const args = [{coords: {}, main_check: 'locs'}];
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).catch(err => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 7', () => {
          const args = [{locs: {}, main_check: 'coords'}];
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).catch(err => {
            chai.expect(err).to.exist;
          });
        });

        it('/missing arguments 8', () => {
          const args = [{coords: {}, locs: {}, main_check: 'whatever'}];
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).catch(err => {
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
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, true, ctx).then(() => {
            const expected = {country: 'de', city: 'munich', zip: '123'};
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
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, true, ctx).then(() => {
            const expected = [
              {country: 'de', city: 'munich', zip: '123'}
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
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).then(() => {
            const expected = [
              {country: 'de', city: 'berlin', zip: '456'},
              {country: 'de', city: 'berlin', zip: '8989'},
              {country: 'de', city: 'munich', zip: '123'},
              {country: 'de', city: 'munich', zip: '234'},
              {country: 'de', city: 'munich', zip: '456'}
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
          let o = ['$geo_check', args];
          featureHandlerMock.features = {geo: geoMock};
          return testCase(o, false, ctx).then(() => {
            const expected = [
              {country: 'de', city: 'berlin'},
              {country: 'de', city: 'munich'},
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

          let o = ['$geo_check', args];
          featureHandlerMock.features = {};
          return testCase(o, false, ctx);
        });

      });

    });
  },
);
