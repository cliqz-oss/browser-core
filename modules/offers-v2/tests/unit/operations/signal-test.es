/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

var prefRetVal = {};
var currentTS = Date.now();
var currentDayHour = 0;
var currentWeekDay = 0;
let hookedResultOfLoggerInfo;

export default describeModule('offers-v2/trigger_machine/ops/signal_expr',
  () => ({
    'offers-v2/db_helper': {
      default: class {
        constructor(db) {
          this.db = db;
        }
        saveDocData(docID, docData) {
          const self = this;
          return new Promise((resolve, reject) => {
            self.db[docID] = JSON.parse(JSON.stringify(docData));
            resolve();
          });
        }
        getDocData(docID) {
          const self = this;
          return new Promise((resolve, reject) => {
            resolve(JSON.parse(JSON.stringify(self.db[docID])));
          });
        }
        removeDocData(docID) {}
      }
    },
    'offers-v2/persistent_cache_db': {
      default: class {
        constructor(db, docName, configs) {
          this.db = db;
        }
        destroy() {}
        saveEntries() {}
        loadEntries() {}
        setEntryData(eid, data) {
          if (!this.db[eid]) {
            this.db[eid] = {
              c_ts: currentTS,
              l_u_ts: currentTS,
              data
            };
          } else {
            this.db[eid].data = data;
            this.db[eid].l_u_ts = currentTS;
          }
        }
        getEntryContainer(eid)  {
          return this.db[eid];
        }
        getEntryData(eid) {
          if (!this.db[eid]) { return null; }
          return this.db[eid].data;
        }
        markEntryDirty() {}
      }
    },
    'offers-v2/signals_handler': {
      default: class {
        constructor() {
          this.signals = {};
        }
        setCampaignSignal(campaignId, offerId, originID, key) {
          let cm = this.signals[campaignId];
          if (cm === undefined) {
            cm = (this.signals[campaignId] = {});
          }
          cm = cm[offerId];
          if (cm === undefined) {
            cm = (this.signals[campaignId][offerId] = {});
          }
          cm = cm[originID];
          if (cm === undefined) {
            cm = (this.signals[campaignId][offerId][originID] = {});
          }
          cm = cm[key];
          if (cm === undefined) {
            this.signals[campaignId][offerId][originID][key] = 0;
          }
          this.signals[campaignId][offerId][originID][key] += 1;
          return true;
        }
        clear() {
          this.signals = {};
        }
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
        // isOfferPresent: offerId => oidList.indexOf(offerId) >= 0,
        // sendSignal: (offerId, k) => hookedFunc(offerId, k),
        // getCampaignID: offerId => (oidList.indexOf(offerId) >= 0) ? cid : null,
        // getCampaignOffers: c => cid === c ? new Set([oidList]) : null,
        // getLatestUpdatedOffer: offersSet => [{ offer_id: 'offer1', campaign_id: cid }],
        constructor() {
          this.offers = {};
          this.cids = {};
          this.luo = null;
        }
        forceLatestUpdated(offers) {
          this.luo = offers;
        }
        addOffer(obj) {
          this.offers[obj.offer_id] = obj;
          if (!this.cids[obj.cid]) {
            this.cids[obj.cid] = new Set();
          }
          this.cids[obj.cid].add(obj.offer_id);
        }
        isOfferPresent(oid) {
          return this.offers[oid] ? true : false;
        }
        getCampaignID(oid) {
          if (!this.offers[oid]) {
            return null;
          }
          return this.offers[oid].cid;
        }
        getCampaignOffers(cid) { return this.cids[cid]; }
        getLatestUpdatedOffer(ofs) {
          if (this.luo) {
            return this.luo;
          }
          if (ofs.size === 0) {
            return null;
          }
          // return first
          const oid = ofs.values().next().value;
          return [this.offers[oid]];
        }
        clear() {
          this.offers = {};
          this.cids = {};
          this.luo = null;
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
    describe('/signal operations', () => {
      let ops;
      let resultHookedFunc;
      let resultIncOfferAction;
      let PersistentCacheDB;
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
      let SignalHandler;
      let sigHandlerMock;

      function mockEventLoop(obj) {
        eventLoop = obj;
      }

      function hookedFunc(...args) {
        resultHookedFunc = args;
      }

      function hookedIncOfferAction(...args) {
        resultIncOfferAction = args;
      }

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

      function checkCampaignSignal(cid, oid, origID, key, expectedVal) {
        function pmock() {
          return JSON.stringify(sigHandlerMock);
        }
        let cm = sigHandlerMock.signals[cid];
        chai.expect(cm, `no campaign_id found: ${cid} - ${pmock()}`).to.exist;
        cm = cm[oid];
        chai.expect(cm, `no offer id found: ${oid} - ${pmock()}`).to.exist;
        cm = cm[origID];
        chai.expect(cm, `no originID found: ${origID} - ${pmock()}`).to.exist;
        cm = cm[key];
        chai.expect(cm, `no key found or invalid value: ${key} - cm: ${cm} - ${pmock()}`).eql(expectedVal);
      }

      function testSigExpectedVal(op, expectedRetVal, esm, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).to.eq(expectedRetVal);
          checkCampaignSignal(esm.cid, esm.oid, esm.origID, esm.key, esm.expectedValue);
          return Promise.resolve(result);
        });
      }

      function testEmptyCase(op, expectedRetVal, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).to.eq(expectedRetVal);
          chai.expect(sigHandlerMock.signals).eql({});
          return Promise.resolve(result);
        });
      }

      function testCase(op, expectedVal, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).to.eq(expectedVal);
          return Promise.resolve(result);
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
        PersistentCacheDB = this.deps('offers-v2/persistent_cache_db').default;
        SignalHandler = this.deps('offers-v2/signals_handler').default;
        sigHandlerMock = new SignalHandler();
        buildDataGen = {
          regex_cache: new RegexpCache(),
          offers_db: odb,
          offer_processor: offerProcMock,
          history_index: historyIdxMock,
          event_handler: evtHandlerMock,
          trigger_machine_executor: tmeMock,
          signals_handler: sigHandlerMock
        };
        return this.system.import('offers-v2/trigger_machine/exp_builder').then((mod) => {
          ExpressionBuilder = mod.default;
          exprBuilder = new ExpressionBuilder(buildDataGen);
        });
      });


      /**
       * ==================================================
       * $send_signal operation tests
       * ==================================================
       */
      describe('/send_signal', () => {
        context('version 1.0', function () {

          beforeEach(function () {
            prefRetVal = {};
            offerProcMock.clear();
            historyIdxMock.clear();
            tmeMock.clear();
            evtHandlerMock.clear();
            sigHandlerMock.clear();
            odb.clear();
          });

          it('/do not send signal', () => {
            const op = ['$send_signal', ['HC1', 'key']];
            const ctx = {};
            return testEmptyCase(op, false, ctx);
          });

          it('/send signal', () => {
            const ctx = {};
            const o = { offer_id: 'HC1', cid: 'cid' };
            const expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key']];

            odb.addOffer(o);
            return testSigExpectedVal(op, true, expected, ctx)
          });

        });

        context('version 2.0', function () {
          let sharedDbUrl;
          let sharedDbSig;
          let urlSignalsDB;
          let lastCampaignSignalDB
          let omh;
          let ctx;
          beforeEach(function () {
            ctx = {};
            sigHandlerMock.clear();
            prefRetVal = {};
            offerProcMock.clear();
            historyIdxMock.clear();
            tmeMock.clear();
            evtHandlerMock.clear();
            sharedDbUrl = {};
            sharedDbSig = {};
            buildDataGen.url_signal_db = new PersistentCacheDB(sharedDbUrl);
            buildDataGen.last_campaign_signal_db = new PersistentCacheDB(sharedDbSig);
            odb.clear();
          });

          // if store present then we get proper signal.
          it('/if store present then we get proper signal', () => {
            // send signal twice and should we get 2 different signals
            const o = { offer_id: 'HC1', cid: 'cid' };
            let expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key', 'cid', {store: true}]];
            ctx = {'#url': 'www.google.com'};;

            odb.addOffer(o);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected = {
                cid: o.cid,
                oid: o.offer_id,
                origID: 'trigger',
                key: 'repeated_key',
                expectedValue: 1
              };
              return testSigExpectedVal(op, true, expected, ctx);
            })
          });

          it('/no store present -> send signal correct multiple times (no repeated_ is present)', () => {
            const o = { offer_id: 'HC1', cid: 'cid' };
            let expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key_2', 'cid']];
            ctx = {'#url': 'www.google.com'};;

            odb.addOffer(o);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected = {
                cid: o.cid,
                oid: o.offer_id,
                origID: 'trigger',
                key: 'key_2',
                expectedValue: 2
              };
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/store present but false -> send signal correct multiple times (no repeated_ is present)', () => {
            const o = { offer_id: 'HC1', cid: 'cid'};
            let expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key_2', 'cid', {store: false}]];
            ctx = {'#url': 'www.google.com'};;

            odb.addOffer(o);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected = {
                cid: o.cid,
                oid: o.offer_id,
                origID: 'trigger',
                key: 'key_2',
                expectedValue: 2
              };
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/store present -> simple url, first sent without repeated_, second with it.', () => {
            const o = { offer_id: 'HC1', cid: 'cid'};
            let expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key_2', 'cid', {store: true}]];
            ctx = {'#url': 'www.google.com'};;

            odb.addOffer(o);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected = {
                cid: o.cid,
                oid: o.offer_id,
                origID: 'trigger',
                key: 'repeated_key_2',
                expectedValue: 1
              };
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/store present -> 2 urls, first sent 2 times, behaves as expected, second same ', () => {
            const o = { offer_id: 'HC1', cid: 'cid'};
            let expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key_2', 'cid', {store: true}]];
            ctx = {'#url': 'www.google.com'};;

            odb.addOffer(o);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected = {
                cid: o.cid,
                oid: o.offer_id,
                origID: 'trigger',
                key: 'repeated_key_2',
                expectedValue: 1
              };
              return testSigExpectedVal(op, true, expected, ctx).then(() => {
                ctx = {'#url': 'www.google2.com'};;
                expected = {
                cid: o.cid,
                oid: o.offer_id,
                origID: 'trigger',
                key: 'key_2',
                expectedValue: 2
                };
                return testSigExpectedVal(op, true, expected, ctx).then(() => {
                  ctx = {'#url': 'www.google2.com'};;
                  expected = {
                  cid: o.cid,
                  oid: o.offer_id,
                  origID: 'trigger',
                  key: 'repeated_key_2',
                  expectedValue: 2
                  };
                  return testSigExpectedVal(op, true, expected, ctx);
                });
              });
            });
          });

          it('/store present -> 2 urls, first of each not repeated, second of both repeated (order not influences)', () => {
            const o = { offer_id: 'HC1', cid: 'cid'};
            let expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key_2', 'cid', {store: true}]];
            ctx = {'#url': 'www.google.com'};;

            odb.addOffer(o);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              ctx = {'#url': 'www.google2.com'};
              expected = {
                cid: o.cid,
                oid: o.offer_id,
                origID: 'trigger',
                key: 'key_2',
                expectedValue: 2
              };
              return testSigExpectedVal(op, true, expected, ctx).then(() => {
                ctx = {'#url': 'www.google.com'};
                expected = {
                  cid: o.cid,
                  oid: o.offer_id,
                  origID: 'trigger',
                  key: 'repeated_key_2',
                  expectedValue: 1
                };
                return testSigExpectedVal(op, true, expected, ctx).then(() => {
                  ctx = {'#url': 'www.google2.com'};;
                  expected = {
                  cid: o.cid,
                  oid: o.offer_id,
                  origID: 'trigger',
                  key: 'repeated_key_2',
                  expectedValue: 2
                  };
                  return testSigExpectedVal(op, true, expected, ctx);
                });
              });
            });
          });

          it('/1 url, different campaigns, repeated works', () => {
            const o = { offer_id: 'HC1', cid: 'cid'};
            const o2 = { offer_id: 'HC2', cid: 'cid2'};
            let expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key_2', 'cid', {store: true}]];
            ctx = {'#url': 'www.google.com'};

            odb.addOffer(o);
            odb.addOffer(o2);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected = {
                cid: 'cid2',
                oid: 'HC2',
                origID: 'trigger',
                key: 'repeated_key_2',
                expectedValue: 1
              };
              const op = ['$send_signal', ['HC2', 'key_2', 'cid2', {store: true}]];
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/1 url, different signal name, same offer, repeated works', () => {
            const o = { offer_id: 'HC1', cid: 'cid'};
            let expected = {
              cid: o.cid,
              oid: o.offer_id,
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['HC1', 'key_2', 'cid', {store: true}]];
            ctx = {'#url': 'www.google.com'};

            odb.addOffer(o);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected = {
                cid: 'cid',
                oid: 'HC1',
                origID: 'trigger',
                key: 'repeated_key_3',
                expectedValue: 1
              };
              const op = ['$send_signal', ['HC1', 'key_3', 'cid', {store: true}]];
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });


          // // ////////////////////////////////////////////////////////////////////
          // // filtered_last_secs tests:
          // // ////////////////////////////////////////////////////////////////////

          it('/no present-> 5 consecutives times the same signal can be sent (same offer / campaign / signal)', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid']];
            ctx = {'#url': 'www.google.com'};
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected.expectedValue = 2;
              return testSigExpectedVal(op, true, expected, ctx).then(() => {
                expected.expectedValue = 3;
                return testSigExpectedVal(op, true, expected, ctx).then(() => {
                  expected.expectedValue = 4;
                  return testSigExpectedVal(op, true, expected, ctx);
                });
              });
            });
          });

          it('/present but value == 0 -> 5 consecutives times the same signal can be sent (same offer / campaign / signal)', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 0}]];
            ctx = {'#url': 'www.google.com'};
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected.expectedValue = 2;
              return testSigExpectedVal(op, true, expected, ctx).then(() => {
                expected.expectedValue = 3;
                return testSigExpectedVal(op, true, expected, ctx).then(() => {
                  expected.expectedValue = 4;
                  return testSigExpectedVal(op, true, expected, ctx);
                });
              });
            });
          });

          it('/present-> 2 consecutive signals are not sent (same signal, cid)', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
            ctx = {'#url': 'www.google.com'};
            currentTS = 1;
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              currentTS = 5;
              sigHandlerMock.clear();
              return testEmptyCase(op, true, ctx);
            });
          });

          it('/present-> 2 consecutive signals are not sent (same signal, cid, different offers)', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
            ctx = {'#url': 'www.google.com'};
            currentTS = 1;
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              currentTS = 5;
              const op = ['$send_signal', ['offer2', 'key_2', 'cid', {filter_last_secs: 10}]];
              sigHandlerMock.clear();
              return testEmptyCase(op, true, ctx);
            });
          });

          it('/present-> 2 consecutive signals properly sent (different signal, same cid)', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
            ctx = {'#url': 'www.google.com'};
            currentTS = 1;
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              currentTS = 5;
              expected.expectedValue = 1;
              const op = ['$send_signal', ['offer1', 'key_3', 'cid', {filter_last_secs: 10}]];
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/present-> 2 consecutive signals properly sent (same signal, different cid)', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid2'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
            ctx = {'#url': 'www.google.com'};
            currentTS = 1;
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              currentTS = 5;
              expected.expectedValue = 1;
              const op = ['$send_signal', ['offer2', 'key_2', 'cid2', {filter_last_secs: 10}]];
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/present-> 2 signals are sent if time threshold is bigger than argument', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid2'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
            ctx = {'#url': 'www.google.com'};
            currentTS = 1;
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              currentTS = 12 * 1000;
              expected.expectedValue = 2;
              const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/present-> 3 first sent, second filtered, third sent (threshold works after as well)', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid2'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
            ctx = {'#url': 'www.google.com'};
            currentTS = 1;
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              currentTS = 5;
              expected.expectedValue = 1;
              const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
              return testSigExpectedVal(op, true, expected, ctx).then(() => {
                currentTS = 11 * 1000;
                expected.expectedValue = 2;
                const op = ['$send_signal', ['offer1', 'key_2', 'cid', {filter_last_secs: 10}]];
                return testSigExpectedVal(op, true, expected, ctx);
              });
            });
          });

          // // ////////////////////////////////////////////////////////////////////
          // // get_last_active_offer
          // // ////////////////////////////////////////////////////////////////////

          it('/unique offer is sent properly, for different signals', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid2'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid']];
            ctx = {'#url': 'www.google.com'};
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected.key = 'key_1';
              const op = ['$send_signal', ['offer1', 'key_1', 'cid']];
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/2 offers different cid are sent properly', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid2'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid']];
            ctx = {'#url': 'www.google.com'};
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              expected.oid = 'offer2';
              expected.cid = 'cid2';
              const op = ['$send_signal', ['offer2', 'key_2', 'cid2']];
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          it('/2 offers same cid, o1 latest updated is sent first, same op but o2 latest update is sent prop', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer2', 'key_2', 'cid']];
            ctx = {'#url': 'www.google.com'};
            odb.forceLatestUpdated([{offer_id: 'offer1', cid: 'cid'}]);
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              odb.forceLatestUpdated([{offer_id: 'offer2', cid: 'cid'}]);
              expected.oid = 'offer2';
              const op = ['$send_signal', ['offer1', 'key_2', 'cid2']];
              return testSigExpectedVal(op, true, expected, ctx);
            });
          });

          // // ////////////////////////////////////////////////////////////////////
          // // OLD TESTS: maybe weakly implemented
          // // ////////////////////////////////////////////////////////////////////
          // //
          // // filter_last_secs present works


          // it('/filter_last_secs present filters the offer after the given time in seconds', () => {
          //   const oid = 'offer-id';
          //   const cid = 'cid-id';
          //   const key = 'key-name';
          //   mockEventLoop({
          //     environment: {
          //       isOfferPresent: offerId => true,
          //       sendSignal: (offerId, k) => hookedFunc(offerId, k),
          //       getCampaignID: offerId => cid,
          //       getCampaignOffers: cid => new Set([oid]),
          //       getLatestUpdatedOffer: offersSet => [{ offer_id: oid, campaign_id: cid }],
          //       timestampMS: () => mockedTS,
          //       incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
          //     },
          //     urlSignalsDB,
          //     lastCampaignSignalDB,
          //   });

          //   // send signal twice and should we get 2 different signals
          //   mockCurrentTS(1);
          //   let input = [oid, key, cid, {filter_last_secs: 10}];
          //   ctx = {'#url': 'www.google.com'};
          //   return op.call(this, input, eventLoop, context).then(
          //     (result) => {
          //       chai.expect(result).eql(true);
          //       chai.expect(resultHookedFunc).eql([oid, key]);
          //       resultHookedFunc = null;
          //       mockCurrentTS(9 * 1000);
          //       return op.call(this, input, eventLoop, context).then(
          //         (result) => {
          //           chai.expect(result).eql(true);
          //           chai.expect(resultHookedFunc).eql(null);
          //           return Promise.resolve(true);
          //         });
          //     });
          // });

          // it('/filter_last_secs present works for same offer different signal', () => {
          //   const oid = 'offer-id';
          //   const cid = 'cid-id';
          //   const key = 'key-name';
          //   mockEventLoop({
          //     environment: {
          //       isOfferPresent: offerId => true,
          //       sendSignal: (offerId, k) => hookedFunc(offerId, k),
          //       getCampaignID: offerId => cid,
          //       getCampaignOffers: cid => new Set([oid]),
          //       getLatestUpdatedOffer: offersSet => [{ offer_id: oid, campaign_id: cid }],
          //       timestampMS: () => mockedTS,
          //       incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
          //     },
          //     urlSignalsDB,
          //     lastCampaignSignalDB,
          //   });

          //   // send signal twice and should we get 2 different signals
          //   mockCurrentTS(1);
          //   let input = [oid, key, cid, {filter_last_secs: 10}];
          //   ctx = {'#url': 'www.google.com'};
          //   return op.call(this, input, eventLoop, context).then(
          //     (result) => {
          //       chai.expect(result).eql(true);
          //       chai.expect(resultHookedFunc).eql([oid, key]);
          //       resultHookedFunc = null;
          //       input = [oid, 'key-2', cid, {filter_last_secs: 10}];
          //       return op.call(this, input, eventLoop, context).then(
          //         (result) => {
          //           chai.expect(result).eql(true);
          //           chai.expect(resultHookedFunc).eql([oid, 'key-2']);
          //           return Promise.resolve(true);
          //         });
          //     });
          // });

          // it('/filter_last_secs present works for different offer same signal', () => {
          //   const oid = 'offer-id';
          //   const cid = 'cid-id';
          //   const key = 'key-name';
          //   mockEventLoop({
          //     environment: {
          //       isOfferPresent: offerId => true,
          //       sendSignal: (offerId, k) => hookedFunc(offerId, k),
          //       getCampaignID: offerId => cid,
          //       getCampaignOffers: cid => new Set([oid]),
          //       getLatestUpdatedOffer: offersSet => [{ offer_id: oid, campaign_id: cid }],
          //       timestampMS: () => mockedTS,
          //       incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
          //     },
          //     urlSignalsDB,
          //     lastCampaignSignalDB,
          //   });

          //   // send signal twice and should we get 2 different signals
          //   mockCurrentTS(1);
          //   let input = [oid, key, cid, {filter_last_secs: 10}];
          //   ctx = {'#url': 'www.google.com'};
          //   return op.call(this, input, eventLoop, context).then(
          //     (result) => {
          //       chai.expect(result).eql(true);
          //       chai.expect(resultHookedFunc).eql([oid, key]);
          //       resultHookedFunc = null;
          //       input = ['offer-id2', key, cid, {filter_last_secs: 10}];
          //       mockCurrentTS(9 * 1000);
          //       return op.call(this, input, eventLoop, context).then(
          //         (result) => {
          //           chai.expect(result).eql(true);
          //           chai.expect(resultHookedFunc).eql(null);
          //           return Promise.resolve(true);
          //         });
          //     });
          // });


          // // filter_last_secs present works for same offer different signal
          // // filter_last_secs not present doesnt affect

          // // offer id sent is the last offer active
          // it('/filter_last_secs present works for different offer same signal', () => {
          //   const oid = 'offer-id';
          //   const oid2 = 'offer-id';
          //   const cid = 'cid-id';
          //   const key = 'key-name';
          //   mockEventLoop({
          //     environment: {
          //       isOfferPresent: offerId => true,
          //       sendSignal: (offerId, k) => hookedFunc(offerId, k),
          //       getCampaignID: offerId => cid,
          //       getCampaignOffers: (d) => {
          //         if (d === cid) {
          //           return new Set([oid, oid2])
          //         }
          //         return null;
          //       },
          //       getLatestUpdatedOffer: (offersSet) => {
          //         if (offersSet.has(oid2)) {
          //           return [{ offer_id: oid2, campaign_id: cid }];
          //         }
          //         return [];
          //       },
          //       timestampMS: () => mockedTS,
          //       incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
          //     },
          //     urlSignalsDB,
          //     lastCampaignSignalDB,
          //   });

          //   // send signal twice and should we get 2 different signals
          //   mockCurrentTS(1);
          //   let input = [oid, key, cid];
          //   ctx = {'#url': 'www.google.com'};
          //   return op.call(this, input, eventLoop, context).then(
          //     (result) => {
          //       chai.expect(result).eql(true);
          //       chai.expect(resultHookedFunc).eql([oid2, key]);
          //       return Promise.resolve(true);
          //     });
          // });

          // // ////////////////////////////////////////////////////////////////////
          // // Referrer test ("referrer_cat": true)
          // // ////////////////////////////////////////////////////////////////////
          // //

          it('/no referrer cat doesnt send anything', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid']];
            ctx = {'#url': 'www.google.com', '#referrer': 'google'};
            return testSigExpectedVal(op, true, expected, ctx);
          });

          it('/referrer_Cat false doesnt send anything', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', { referrer_cat: false }]];
            ctx = {'#url': 'www.google.com', '#referrer': 'google'};
            return testSigExpectedVal(op, true, expected, ctx);
          });

          it('/referrer_cat true -> no referrer = none cat', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', { referrer_cat: true }]];
            ctx = {'#url': 'www.google.com', '#referrer': null};
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              checkCampaignSignal('cid', 'offer1', 'trigger', 'ref_none', 1);
            });
          });

          it('/referrer_cat true -> search engines = search cat', () => {
            odb.addOffer({offer_id: 'offer1', cid: 'cid'});
            odb.addOffer({offer_id: 'offer2', cid: 'cid'});
            let expected = {
              cid: 'cid',
              oid: 'offer1',
              origID: 'trigger',
              key: 'key_2',
              expectedValue: 1
            };
            const op = ['$send_signal', ['offer1', 'key_2', 'cid', { referrer_cat: true }]];
            ctx = {'#url': 'www.google.com', '#referrer': 'google'};
            return testSigExpectedVal(op, true, expected, ctx).then(() => {
              checkCampaignSignal('cid', 'offer1', 'trigger', 'ref_search', 1);
            });
          });
        });

      });
    });
  },
);
