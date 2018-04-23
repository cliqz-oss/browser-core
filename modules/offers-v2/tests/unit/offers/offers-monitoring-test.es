/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

const adblocker = require('@cliqz/adblocker');
const encoding = require('text-encoding');
const tldjs = require('tldjs');


var prefRetVal = {};
var currentTS = Date.now();
var currentDayHour = 0;
var currentWeekDay = 0;
let getDetailsFromUrlReal;
let UrlData;

const buildUrlData = (url, referrer) => {
  return new UrlData(url, referrer);
};

// needed for the map
let persistence = {};
function delay(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Promise.resolve()
        .then(fn)
        .then(resolve)
        .catch(reject);
    }, 100);
  });
}

let buildMultiPatternIndex;
let buildSimplePatternIndex;
let tokenizeUrl;




export default describeModule('offers-v2/offers/offers-monitoring',
  () => ({
    'platform/lib/adblocker': {
      default: adblocker,
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
    'platform/lib/tldjs': {
      default: tldjs,
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
    'offers-v2/offers/offers-db': {
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

        registerCallback() {}
        unregisterCallback() {}

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
    'offers-v2/event_handler': {
      default: class {
        constructor() {
          this.httpMap = new Map();
          this.urlMap = new Map();
        }
        isHttpReqDomainSubscribed(cb, dom) {
          return this.httpMap.has(dom) && this.httpMap.get(dom).has(cb);
        }
        subscribeHttpReq(cb, domainName, cargs = null) {
          if (!this.httpMap.has(domainName)) {
            this.httpMap.set(domainName, new Set());
          }
          this.httpMap.get(domainName).add(cb);
        }
        unsubscribeHttpReq(cb, domainName) {
          if (this.httpMap.has(domainName)) {
            this.httpMap.get(domainName).delete(cb);
          }
        }
        subscribeUrlChange(cb, cargs = null) {
          this.urlMap.set(cb, cargs);
        }
        unsubscribeUrlChange(cb) {
          this.urlMap.delete(cb);
        }

        simUrlChange(url, ref) {
          this.urlMap.forEach((cargs, cb) => cb(buildUrlData(url, ref), cargs));
        }
        simWebRequest(url, ref) {
          // need to get domain here
          const urlData = buildUrlData(url, ref);
          const domain = urlData.getDomain();
          if (this.httpMap.has(domain)) {
            this.httpMap.get(domain).forEach(cb => cb({ url_data: urlData }));
          }
        }
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
    'core/cliqz': {
      default: {},
      utils: {
        setInterval: function() {},
        getDetailsFromUrl: function(url) {
          // we should extract the name here
          return getDetailsFromUrlReal(url);
        },
      }
    },
    'platform/console': {
      default: {},
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: (...x) => {console.error(...x);},
        info: () => {},
        log: (...x) => {console.log(...x);},
        warn: (...x) => {console.error(...x);},
        logObject: () => {},
      }
    },
    'core/persistence/map': {
      default: class MockMap {
        constructor(dbName) {
          persistence[dbName] = (persistence[dbName] || new Map());
          this.db = persistence[dbName];
        }

        init() {
          return Promise.resolve();
        }

        unload() {
          return Promise.resolve();
        }

        get(key) {
          return delay(() => this.db.get(key));
        }

        set(key, value) {
          return delay(() => this.db.set(key, value));
        }

        has(key) {
          return delay(() => this.db.has(key));
        }

        delete(key) {
          return delay(() => this.db.delete(key));
        }

        clear() {
          return delay(() => this.db.clear());
        }

        size() {
          return delay(() => this.db.size());
        }

        keys() {
          return delay(() => [...this.db.keys()]);
        }

        entries() {
          return delay(() => [...this.db.entries()]);
        }
      }
    }
  }),
  () => {
    describe('/signal operations', function () {
      let odb;
      let OfferDB;
      let EventHandler;
      let evtHandlerMock;
      let SignalHandler;
      let sigHandlerMock;
      let OffersMonitorHandler;
      let omh;
      let db;
      let PersistentCacheDB;



      function checkCampaignSignal(cid, oid, origID, key, expectedVal, msg = '') {
        function pmock() {
          return JSON.stringify(sigHandlerMock);
        }
        let cm = sigHandlerMock.signals[cid];
        chai.expect(cm, `no campaign_id found: ${cid} - ${pmock()} -- ${msg}`).to.exist;
        cm = cm[oid];
        chai.expect(cm, `no offer id found: ${oid} - ${pmock()} -- ${msg}`).to.exist;
        cm = cm[origID];
        chai.expect(cm, `no originID found: ${origID} - ${pmock()} -- ${msg}`).to.exist;
        cm = cm[key];
        chai.expect(cm, `no key found or invalid value: ${key} - cm: ${cm} - ${pmock()} -- ${msg}`).eql(expectedVal);
      }

      function checkNotExistCampaignSignal(cid, oid, origID, key) {
        function pmock() {
          return JSON.stringify(sigHandlerMock);
        }
        let cm = sigHandlerMock.signals[cid];
        cm = cm === undefined ? undefined : cm[oid];
        cm = cm === undefined ? undefined : cm[origID];
        cm = cm === undefined ? undefined : cm[key];
        chai.expect(cm, `the signal exists: - ${pmock()}`).eql(undefined);
      }

      function buildMonitorOffer(od, mdList) {
        const monitorData = [];
        mdList.forEach((md) => {
          monitorData.push({
            signalID: md.signalID,
            type: md.type || 'urlchange',
            params: md.params,
            patterns: md.patterns,
          });
        });
        return {
          offer_id: od.offer_id,
          cid: od.cid,
          monitorData,
        };
      }

      function simulateEvents(eList) {
        eList.forEach((e) => {
          if (e.t === undefined || e.t === 'urlchange') {
            // console.log('#### simulating: ', e);
            evtHandlerMock.simUrlChange(e.u, e.r);
            // console.log('#### simulating: DONE FOR', e);
          } else {
            evtHandlerMock.simWebRequest(e.u, e.r);
          }
        });
      }

      function checkNoSignals() {
        chai.expect(sigHandlerMock.signals).eql({});
      }

      function buildAndAddOffer(offer, monitorData) {
        odb.addOffer(offer);
        const mo = buildMonitorOffer(offer, monitorData);
        omh.addOfferMonitors(mo);
        omh.build();
        return mo;
      }

      beforeEach(function () {
        OffersMonitorHandler = this.module().default;
        OfferDB = this.deps('offers-v2/offers/offers-db').default;
        EventHandler = this.deps('offers-v2/event_handler').default;
        SignalHandler = this.deps('offers-v2/signals_handler').default;

        return Promise.all([
          this.system.import('offers-v2/common/url_data'),
          this.system.import('core/url'),
          this.system.import('offers-v2/common/pattern-utils'),
          ]).then((mods) => {
          UrlData = mods[0].default;
          getDetailsFromUrlReal = mods[1].getDetailsFromUrl;
          buildMultiPatternIndex = mods[2].buildMultiPatternIndex;
          buildSimplePatternIndex = mods[2].buildSimplePatternIndex;
          tokenizeUrl = mods[2].default;
        });
      });


      /**
       * ==================================================
       * The test data is:
       * INPUT:
       *   - offers with monitor data.
       *   - urlChange events or web requests events.
       * OUTPUT:
       *   - signals being sent.
       * ==================================================
       */
      describe('/offers-monitoring tests', function () {
        context('/all tests', function () {

          beforeEach(function () {
            db = {};
            odb = new OfferDB();
            evtHandlerMock = new EventHandler();
            sigHandlerMock = new SignalHandler();
            omh = new OffersMonitorHandler(sigHandlerMock,
                                           odb,
                                           evtHandlerMock);
          });

          it('/one offer 1 simple url monitor not trigger for wrong urls', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com']
            }];
            const evts = [
              { u: 'http://www.gooogle.com' },
              { u: 'http://www.yahoo.com' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google2.com' },
              { u: 'http://www.gooogle.com/google.com' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkNoSignals();
          });

          it('/one offer 1 with multiple signals monitors will be triggered properly', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com']
            }, {
              signalID: 's2',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com']
            }, {
              signalID: 's3',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com']
            }, {
              signalID: 's4',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com']
            }, {
              signalID: 's5',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com']
            }];
            const evts = [
              { u: 'http://www.google.com' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            monitors.forEach((m) => checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', m.signalID, 1));
          });

          it('/one offer 1 simple url monitor trigger proper urls', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: ['||en.wikipedia.org*/Augustine_(given_name)']
            }];
            const evts = [
              { u: 'https://en.wikipedia.org/wiki/Augustine_(given_name)' },
              { u: 'http://www.yahoo.com' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google.com/Agustin_servus' },
              { u: 'http://www.gooogle.com/google.com' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
          });

          // /one offer N simple monitors works
          it('/one offer N simple monitors works', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: ['||google.de']
            }, {
              signalID: 's2',
              type: 'urlchange',
              params: null,
              patterns: ['||yahoo.com']
            }
            ];
            const evts = [
              { u: 'http://www.gooogle.com' },
              { u: 'http://www.yahoo.com' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google2.com' },
              { u: 'http://www.gooogle.com/google.com' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
          });

          it('/SIMPLE buildMultiPatternIndex test', function () {
            const offers = [
              { offer_id: 'hc1', cid: 'cid' },
              { offer_id: 'hc2', cid: 'cid2' },
              { offer_id: 'hc3', cid: 'cid3' },
              { offer_id: 'hc4', cid: 'cid4' },
            ];
            const patternsTuples = [];
            offers.forEach((o) => {
              patternsTuples.push({ patterns: [`||google.de/${o.offer_id}`], groupID: o.offer_id });
            });

            const multiPatternIndex = buildMultiPatternIndex(patternsTuples);
            const simplePattern = `||google.de/${offers[0].offer_id}`;
            const simpleIndex = buildSimplePatternIndex([simplePattern]);

            // simple test
            const simpleUrl = tokenizeUrl(`http://www.google.de/${offers[0].offer_id}`);
            chai.expect(simpleIndex.match(simpleUrl), `url: ${simpleUrl}, - ${simpleIndex}`).eql(true);

            // // current event doesnt trigger anything
            // let evts = [
            //   { u: 'http://www.google.de' },
            //   { u: 'http://www.yahoo.com' },
            // ];

            // evts.forEach((e) => {
            //   const turl = tokenizeUrl(e.u);
            //   chai.expect(multiPatternIndex.match(turl).size, `url: ${e.u}`).eql(0);
            // });

            // now only first 2 offers are triggered
            let evts = [
              { u: `http://www.google.de/${offers[0].offer_id}` },
              { u: `http://www.google.de/${offers[1].offer_id}` },
            ];

            evts.forEach((e) => {
              const turl = tokenizeUrl(e.u);
              chai.expect(multiPatternIndex.match(turl).size, `url: ${e.u}`).eql(1);
            });
          });

          it('/M non related offers N simple monitors works', function () {
            const offers = [
              { offer_id: 'hc1', cid: 'cid' },
              { offer_id: 'hc2', cid: 'cid2' },
              { offer_id: 'hc3', cid: 'cid3' },
              { offer_id: 'hc4', cid: 'cid4' },
            ];
            const monitors = [];
            offers.forEach((o) => {
              monitors.push([{
                signalID: `sig-${o.offer_id}`,
                type: 'urlchange',
                params: null,
                patterns: [`||google.de/${o.offer_id}`],
              }]);
            });

            for (let i = 0; i < offers.length; i += 1) {
              const offer = offers[i];
              const monitorsData = monitors[i];
              buildAndAddOffer(offer, monitorsData);
            }

            const checkSignalsForOffersRange = (sidx, eidx, msg = '') => {
              for (let i = sidx; i <= eidx; i += 1) {
                checkCampaignSignal(offers[i].cid, offers[i].offer_id, 'trigger', monitors[i][0].signalID, 1, msg);
              }
            };

            // current event doesnt trigger anything
            let evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.yahoo.com' },
            ];

            simulateEvents(evts);
            checkNoSignals();

            // now only first 2 offers are triggered
            evts = [
              { u: `http://www.google.de/${offers[0].offer_id}` },
              { u: 'http://www.yahoo.com' },
              { u: `http://www.google.de/${offers[1].offer_id}` },
            ];

            console.log('################################################################ BEFORE');
            simulateEvents(evts);
            checkSignalsForOffersRange(0, 1, 'only first 2 should match');
            console.log('################################################################ AFTER');

            // now other 2 offers are triggered
            evts = [
              { u: `http://www.google.de/${offers[2].offer_id}` },
              { u: 'http://www.yahoo.com' },
              { u: `http://www.google.de/${offers[3].offer_id}` },
            ];

            simulateEvents(evts);
            checkSignalsForOffersRange(0, 3, 'other 2 offers are triggered');
          });

          it('/if store present then we get proper signal', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { store: true },
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.yahoo.com' },
              { u: 'http://www.google2.de' },
              { u: 'http://www.google2.com' },
              { u: 'http://www.gooogle.com/google.com' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);

            // simulate again and we should get the signal with the repeated_ prefix
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', `repeated_${monitors[0].signalID}`, 1);
          });


          it('/no store present -> send signal correct multiple times (no repeated_ is present)', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.yahoo.com' },
              { u: 'http://www.google2.de' },
              { u: 'http://www.google2.com' },
              { u: 'http://www.gooogle.com/google.com' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 2);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 3);
          });


          it('/store present but false -> send signal correct multiple times (no repeated_ is present)', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { store: false },
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.yahoo.com' },
              { u: 'http://www.google2.de' },
              { u: 'http://www.google2.com' },
              { u: 'http://www.gooogle.com/google.com' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 2);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 3);
          });


          it('/store present -> works for 2 monitors ', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { store: true },
              patterns: ['||google.de']
            }, {
              signalID: 's2',
              type: 'urlchange',
              params: { store: true },
              patterns: ['||facebook.com']
            }];
            let evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google2.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            // match only s1 normal
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);

            // match s2 normal and only
            evts = [
              { u: 'http://www.google2.de' },
              { u: 'http://www.facebook.com' },
            ];
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);

            // match s1 and s2 => repeated_
            evts = [
              { u: 'http://www.yahoo.com' },
              { u: 'http://www.google.de' },
              { u: 'http://www.facebook.com' },
            ];
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', `repeated_${monitors[0].signalID}`, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', `repeated_${monitors[1].signalID}`, 1);
          });


          it('/1 url, different campaigns, store works', function () {
            const offers = [
              { offer_id: 'HC1', cid: 'cid' },
              { offer_id: 'HC2', cid: 'cid2' },
              { offer_id: 'HC3', cid: 'cid3' },
              { offer_id: 'HC4', cid: 'cid4' },
            ];
            const monitors = [];
            offers.forEach((o) => {
              monitors.push([{
                signalID: `sig`,
                type: 'urlchange',
                params: {store: true},
                patterns: [`||google.de`],
              }]);
            });

            for (let i = 0; i < offers.length; i += 1) {
              const offer = offers[i];
              const monitorsData = monitors[i];
              buildAndAddOffer(offer, monitorsData);
            }

            let evts = [
              { u: 'http://www.google.de' },
            ];

            // now we should see for the first offer the real signal and for the other
            // 3 repeated since is the same url
            simulateEvents(evts);
            checkCampaignSignal(offers[0].cid, offers[0].offer_id, 'trigger', 'sig', 1);
            checkCampaignSignal(offers[1].cid, offers[1].offer_id, 'trigger', 'repeated_sig', 1);
            checkCampaignSignal(offers[2].cid, offers[2].offer_id, 'trigger', 'repeated_sig', 1);
            checkCampaignSignal(offers[3].cid, offers[3].offer_id, 'trigger', 'repeated_sig', 1);
          });

          it('/1 url, different signals names, store works', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { store: true },
              patterns: ['||google.de']
            }, {
              signalID: 's2',
              type: 'urlchange',
              params: { store: true },
              patterns: ['||google.de']
            }];
            let evts = [
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 's1', 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'repeated_s2', 1);
          });

          // // ////////////////////////////////////////////////////////////////////
          // // filtered_last_secs tests:
          // // ////////////////////////////////////////////////////////////////////

          it('/present but value == 0 -> 3 consecutives times the same signal can be sent (same offer / campaign / signal)', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {filter_last_secs: 0},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 3);
          });

          it('/present-> 3 consecutive signals are not sent (same signal, cid)', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {filter_last_secs: 10},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
          });

          it('/present-> 2 consecutive signals are not sent (same signal, cid, different offers)', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const offer2 = { offer_id: 'HC2', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {filter_last_secs: 10},
              patterns: ['||google.de']
            }];
            const monitors2 = [{
              signalID: 's1',
              type: 'urlchange',
              params: {filter_last_secs: 10},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            const mo2 = buildAndAddOffer(offer2, monitors2);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);

            // clear and trigger again
            sigHandlerMock.clear();
            simulateEvents(evts);
            checkNoSignals();
          });

          it('/present-> 2 consecutive signals properly sent (different signal, same cid)', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {filter_last_secs: 10},
              patterns: ['||google.de']
            },{
              signalID: 's2',
              type: 'urlchange',
              params: {filter_last_secs: 10},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
          });

          it('/present-> 2 consecutive signals properly sent (same signal, different cid)', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const offer2 = { offer_id: 'HC2', cid: 'cid2' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {filter_last_secs: 10},
              patterns: ['||google.de']
            }];
            const monitors2 = [{
              signalID: 's1',
              type: 'urlchange',
              params: {filter_last_secs: 10},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            const mo2 = buildAndAddOffer(offer2, monitors2);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
          });

          it('/present-> 2 signals are sent if time threshold is bigger than argument', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {filter_last_secs: 10},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);

            // we will increment a few secs so should not pass
            currentTS += 1000 * 9;
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);

            // now we will increment after the threshold so it should pass but
            // only +1
            currentTS += 1000 * 11;
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 2);
          });


          // // ////////////////////////////////////////////////////////////////////
          // // get_last_active_offer
          // // ////////////////////////////////////////////////////////////////////

          it('/getting last active offer works', function () {
            const offers = [
              { offer_id: 'HC1', cid: 'cid' },
              { offer_id: 'HC2', cid: 'cid' },
              { offer_id: 'HC3', cid: 'cid' },
              { offer_id: 'HC4', cid: 'cid' },
              // { offer_id: 'HC5', cid: 'cid-2' },
            ];
            const monitors = [];
            offers.forEach((o) => {
              monitors.push([{
                signalID: `sig`,
                type: 'urlchange',
                params: {filter_last_secs: 10},
                patterns: [`||google.de`],
              }]);
            });

            for (let i = 0; i < offers.length; i += 1) {
              const offer = offers[i];
              const monitorsData = monitors[i];
              buildAndAddOffer(offer, monitorsData);
            }

            odb.forceLatestUpdated([offers[3]]);
            let evts = [
              { u: 'http://www.google.de' },
            ];

            // only for HC4 from cid and HC5 from cid2 we get a signal
            simulateEvents(evts);
            checkNotExistCampaignSignal(offers[0].cid, offers[0].offer_id, 'trigger', 'sig');
            checkNotExistCampaignSignal(offers[1].cid, offers[1].offer_id, 'trigger', 'sig');
            checkNotExistCampaignSignal(offers[2].cid, offers[2].offer_id, 'trigger', 'sig');
            checkCampaignSignal(offers[3].cid, offers[3].offer_id, 'trigger', 'sig', 1);
            // checkCampaignSignal(offers[4].cid, offers[4].offer_id, 'trigger', 'sig', 1);
          });


          // // ////////////////////////////////////////////////////////////////////
          // // Referrer test ("referrer_cat": true)
          // // ////////////////////////////////////////////////////////////////////
          // //

          it('/referrer_cat true -> no referrer = none cat', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { referrer_cat: true },
              patterns: ['||google.de']
            }];
            let evts = [
              { u: 'http://www.google.de'},
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_none', 1);
            sigHandlerMock.clear();
            checkNoSignals();

             evts = [
              { u: 'http://www.google.de', r: '' },
            ];
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_none', 1);
          });

          it('/referrer_cat true -> referrer = search cat', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { referrer_cat: true },
              patterns: ['||google.de']
            }];
            let evts = [
              { u: 'http://www.google.de', r: 'google'},
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_search', 1);
            sigHandlerMock.clear();
            checkNoSignals();

            evts = [
              { u: 'http://www.google.de', r: 'yahoo' },
            ];
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_search', 1);
            sigHandlerMock.clear();
            checkNoSignals();

            evts = [
              { u: 'http://www.google.de', r: 'bing' },
            ];
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_search', 1);
            sigHandlerMock.clear();
            checkNoSignals();

            evts = [
              { u: 'http://www.google.de', r: 'duckduckgo' },
            ];
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_search', 1);
          });

          it('/referrer_cat true -> referrer = other cat', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { referrer_cat: true },
              patterns: ['||google.de']
            }];
            let evts = [
              { u: 'http://www.google.de', r: 'something'},
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_other', 1);
            sigHandlerMock.clear();
            checkNoSignals();

            evts = [
              { u: 'http://www.google.de', r: 'bank' },
            ];
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_other', 1);
            sigHandlerMock.clear();
            checkNoSignals();

            evts = [
              { u: 'http://www.google.de', r: 'xyz' },
            ];
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'ref_other', 1);
            sigHandlerMock.clear();
            checkNoSignals();

          });

          // TODO add watch requests tests


          it('/remove an offer works', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com']
            }];
            const evts = [
              { u: 'http://www.google.com' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 's1', 1);

            // remove the offer and check we do not get anymore events
            sigHandlerMock.clear();
            omh.removeOfferMonitors(offer.offer_id);
            simulateEvents(evts);
            checkNoSignals();
          });

          it('/remove an offer doesnt affect others', function () {

            const offer = { offer_id: 'HC1', cid: 'cid' };
            const offer2 = { offer_id: 'HC2', cid: 'cid2' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {},
              patterns: ['||google.de']
            }];
            const monitors2 = [{
              signalID: 's1',
              type: 'urlchange',
              params: {},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);
            const mo2 = buildAndAddOffer(offer2, monitors2);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
            // remove the offer and check we do not get anymore events
            sigHandlerMock.clear();
            omh.removeOfferMonitors(offer.offer_id);
            simulateEvents(evts);

            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
            checkNotExistCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID);
          });

          it('/adding a new offer doesnt break old ones', function () {
            const offer = { offer_id: 'HC1', cid: 'cid' };
            const offer2 = { offer_id: 'HC2', cid: 'cid2' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {},
              patterns: ['||google.de']
            }];
            const monitors2 = [{
              signalID: 's1',
              type: 'urlchange',
              params: {},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
            ];

            const mo = buildAndAddOffer(offer, monitors);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkNotExistCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID);


            // remove the offer and check we do not get anymore events
            sigHandlerMock.clear();
            const mo2 = buildAndAddOffer(offer2, monitors2);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
          });

        });
      });
    });
  },
);
