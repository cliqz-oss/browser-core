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


export default describeModule('offers-v2/trigger_machine/ops/trigger_expr',
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
    'core/time': {
      getDaysFromTimeRange: function(startTS, endTS) { },
      getDateFromDateKey: function(dateKey, hours = 0, min = 0, seconds = 0) { },
      timestamp: function() { },
      getTodayDayKey: function() { }
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
    'offers-v2/trigger_machine/trigger_machine_executor': {
      default: class {
        constructor() {
          this.lastData = null;
          this.lastCbArgs = null;
        }
        processWatchReqCallback(data, cbArgs) {
          this.lastData = data;
          this.lastCbArgs = cbArgs;
        }
        clear() {
          this.lastData = null;
          this.lastCbArgs = null;
        }
      }
    },
    'offers-v2/even_handler': {
      default: class {
        constructor() {
          this.lastCb = null;
          this.lastDomName = null;
          this.lastCbArgs = null;
        }
        isHttpReqDomainSubscribed(cb, dom) {
          return false;
        }
        subscribeHttpReq(cb, domainName, cargs = null) {
          this.lastCb = cb;
          this.lastDomName = domainName;
          this.lastCbArgs = cargs;
        }
        clear() {
          this.lastCb = null;
          this.lastDomName = null;
          this.lastCbArgs = null;
        }
      }
    },
    'offers-v2/trigger_cache': {
      default: class {
        constructor() {
          this.triggersAdded = [];
          this.parentTriggerId = null;
          this.subtriggers = null;
          this.triggerId = null;
          this.retSubtriggers = [];
        }
        addTrigger(t) {
          this.triggersAdded.push(t);
        }
        setSubtriggers(parentTriggerId, subtriggers) {
          this.parentTriggerId = parentTriggerId;
          this.subtriggers = subtriggers;
        }
        getSubtriggers(triggerId) {
          this.triggerId = triggerId;
          return this.retSubtriggers;
        }
        clear() {
          this.triggersAdded = [];
          this.parentTriggerId = null;
          this.subtriggers = null;
          this.triggerId = null;
          this.retSubtriggers = [];
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
        clear() {
          this.start = null;
          this.end = null;
          this.lastUrl = null;
          this.context = null;
          this.ret = [];
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
  }),
  () => {
    describe('/trigger operations', () => {
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
      let EventHandler;
      let evtHandlerMock;
      let TriggerMachineExecutor;
      let tmeMock;

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
        prefMock = this.deps('core/prefs').default;
        RegexpCache = this.deps('offers-v2/regexp_cache').default;
        OfferDB = this.deps('offers-v2/offers_db').default;
        odb = new OfferDB();
        OfferProcessor = this.deps('offers-v2/offer_processor').default;
        offerProcMock = new OfferProcessor();
        HistoryIndex = this.deps('offers-v2/history_index').default;
        historyIdxMock = new HistoryIndex();
        EventHandler = this.deps('offers-v2/even_handler').default;
        evtHandlerMock = new EventHandler();
        prefRetVal = {};
        TriggerMachineExecutor = this.deps('offers-v2/trigger_machine/trigger_machine_executor').default;
        tmeMock = new TriggerMachineExecutor();

        buildDataGen = {
          regex_cache: new RegexpCache(),
          offers_db: odb,
          offer_processor: offerProcMock,
          history_index: historyIdxMock,
          event_handler: evtHandlerMock,
          trigger_machine_executor: tmeMock
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
        //   offer_processor: this.globObjs.offer_processor,
        //   signals_handler: this.globObjs.signals_handler,
        //   offers_db: this.globObjs.offers_db,
        //   history_index: this.globObjs.history_index,
        //   last_campaign_signal_db: this.globObjs.last_campaign_signal_db,
        //   url_signal_db: this.globObjs.url_signal_db
        // };

      /**
       * ==================================================
       * $watch_requests operation tests
       * ==================================================
       */
      describe('/watch_requests', () => {
        let op;
        let ctx;

        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          offerProcMock.clear();
          historyIdxMock.clear();
          tmeMock.clear();
          evtHandlerMock.clear();
        });

        it('/invalid args', () => {
          let o = ['$watch_requests', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/simple test', () => {
          let o = ['$watch_requests', ['amazon.com']];
          return testCase(o, true, ctx).then(() => {
            // check that the request was called
            chai.expect(evtHandlerMock.lastDomName).eql('amazon.com');
          });
        });

        it('/double registration works', () => {
          let o = ['$watch_requests', ['amazon.com']];
          return testCase(o, true, ctx).then(() => {
            // check that the request was called
            chai.expect(evtHandlerMock.lastDomName).eql('amazon.com');
            evtHandlerMock.lastDomName = '';
            return testCase(o, true, ctx).then(() => {
              // check that the request was called
              chai.expect(evtHandlerMock.lastDomName).eql('amazon.com');
            });
          });
        });

      });

    //   /**
    //    * ==================================================
    //    * $activate_subtriggers operation tests
    //    * ==================================================
    //    */
    //   describe('/activate_subtriggers', () => {
    //     let op;
    //     let ctx;
    //     beforeEach(function () {
    //       ctx = {};
    //       prefRetVal = {};
    //       offerProcMock.clear();
    //       historyIdxMock.clear();
    //     });

    //      it('/invalid args', () => {
    //       let o = ['$activate_subtriggers', []];
    //       op = buildOp(o);
    //       return op.evalExpr(ctx).then((result) => {
    //         chai.assert.fail(result, 'error');
    //       }).catch((err) => {
    //         chai.expect(err).to.exist;
    //       });
    //     });


    //     it('/fetch (empty) subtriggers', () => {
    //       mockEventLoop({
    //         triggerCache: {
    //           getSubtriggers: parentTriggerId => parentTriggerId === 'root' ? [] : null,
    //           setSubtriggers: (parentTriggerId, substriggers) => {},
    //           addTrigger: trigger => {},
    //         },
    //         environment: {
    //           info: () => {},
    //           sendApiRequest: (action, id) => new Promise((resolve, reject) => resolve([])),
    //         },
    //         triggerMachine: {
    //           run: (trigger, context) => {},
    //         }
    //       });
    //       return Promise.all([
    //         op.call(this, ['root'], eventLoop, {}).then(
    //           (result) => {
    //             chai.expect(result).eql(undefined);
    //           },
    //           (error) => {
    //             chai.assert.fail(error, undefined, error);
    //           }
    //         ),
    //       ]);
    //     });

        // it('/fetch and activate subtriggers', () => {
        //   mockEventLoop({
        //     triggerCache: {
        //       getSubtriggers: parentTriggerId => parentTriggerId === 'root' ? [] : null,
        //       setSubtriggers: (parentTriggerId, substriggers) => {},
        //       addTrigger: trigger => {},
        //     },
        //     environment: {
        //       info: () => {},
        //       sendApiRequest: (action, id) => new Promise((resolve, reject) => resolve([
        //         { trigger_id: 1 },
        //         { trigger_id: 2 }])),
        //     },
        //     triggerMachine: {
        //       run: (trigger, context) => hookedFunc(trigger, context),
        //       isTriggerBeingEvaluated: (t) => false,
        //     }
        //   });
    //       return Promise.all([
    //         op.call(this, ['root'], eventLoop, {}).then(
    //           (result) => {
    //             chai.expect(result).eql(undefined);
    //             chai.expect(resultsHookedFunc).eql([[
    //               { trigger_id: 1 }, { _currentTriggerLevel: 1 }],
    //               [{ trigger_id: 2 }, { _currentTriggerLevel: 1 }]]);
    //           },
    //           (error) => {
    //             chai.assert.fail(error, undefined, error);
    //           }
    //         ),
    //       ]);
    //     });

        // it('/read cached subtriggers and activate them', () => {
        //   mockEventLoop({
        //     triggerCache: {
        //       getSubtriggers: parentTriggerId => parentTriggerId === 'root' ? [
        //         { trigger_id: 1 },
        //         { trigger_id: 2 }] : null,
        //     },
        //     triggerMachine: {
        //       run: (trigger, context) => hookedFunc(trigger, context),
        //       isTriggerBeingEvaluated: (t) => false,
        //     }
        //   });
    //       return Promise.all([
    //         op.call(this, ['root'], eventLoop, {}).then(
    //           (result) => {
    //             chai.expect(result).eql(undefined);
    //             chai.expect(resultsHookedFunc).eql([[
    //               { trigger_id: 1 }, { _currentTriggerLevel: 1 }],
    //               [{ trigger_id: 2 }, { _currentTriggerLevel: 1 }]]);
    //           },
    //           (error) => {
    //             chai.assert.fail(error, undefined, error);
    //           }
    //         ),
    //       ]);
    //     });
      // });
    });
  },
);
