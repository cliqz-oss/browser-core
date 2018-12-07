/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style, no-param-reassign */

const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const signalsMock = require('../utils/offers/signals');
const VALID_OFFER_OBJ = require('../utils/offers/data').VALID_OFFER_OBJ;
const ehMocks = require('../utils/offers/event_handler')['offers-v2/event_handler'];

const EventHandlerMock = ehMocks.default;

let currentTS = Date.now();
const currentDayHour = 0;
const currentWeekDay = 0;
let getDetailsFromUrlReal;

const mockOffer = { offer_id: 'HC1', cid: 'cid', click: 0, last_update: 20000, view: 2003 };
const mockOfferEarlierUpdate = { offer_id: 'HC2', cid: 'cid2', click: 0, last_update: mockOffer.last_update - 100, view: 0 };

const buildUrlData = ehMocks.buildUrlData;

let buildMultiPatternIndex;
let buildSimplePatternIndex;
let tokenizeUrl;

export default describeModule('offers-v2/offers/offers-monitoring',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    ...signalsMock,
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
      timestamp: function () {},
      timestampMS: function () {
        return currentTS;
      },
      dayHour: function () {
        return currentDayHour;
      },
      weekDay: function () {
        return currentWeekDay;
      },
      getABNumber: function () {}
    },
    'core/url': {
      getDetailsFromUrl: function (url) {
        // we should extract the name here
        return getDetailsFromUrlReal(url);
      },
    },
  }),
  () => {
    describe('/signal operations', function () {
      let odb;
      let OfferDB;
      let evtHandlerMock;
      const SignalHandler = signalsMock['offers-v2/signals/signals_handler'].default;
      let sigHandlerMock;
      let OffersMonitorHandler;
      let omh;

      function checkCampaignSignal(cid, oid, origID, key, expectedVal, msg = '') {
        function pmock() {
          return JSON.stringify(sigHandlerMock);
        }
        let cm = sigHandlerMock.getAllCampaignSignals()[cid];
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
        let cm = sigHandlerMock.getAllCampaignSignals()[cid];
        cm = cm === undefined ? undefined : cm[oid];
        cm = cm === undefined ? undefined : cm[origID];
        cm = cm === undefined ? undefined : cm[key];
        chai.expect(cm, `the signal exists: - ${pmock()}`).eql(undefined);
      }

      function buildMockOffer(od, mdList) {
        const monitorData = [];
        mdList.forEach((md) => {
          md.type = md.type || 'urlchange';
          monitorData.push(md);
        });
        const mocked = {
          offer: {
            ...VALID_OFFER_OBJ,
            campaign_id: od.cid,
            offer_id: od.offer_id,
            monitorData,
            ui_info: od.ui_info
          },
          click: od.click,
          last_update: od.last_update,
          view: od.view
        };
        if (!mocked.offer.ui_info) {
          mocked.offer.ui_info = {};
        }
        if (!mocked.offer.ui_info.template_data) {
          mocked.offer.ui_info.template_data = {};
        }
        if (!mocked.offer.ui_info.template_data.validity) {
          mocked.offer.ui_info.template_data.validity = Date.now() / 1000 + 60 * 60 * 24 * 30;
        }
        return mocked;
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
        chai.expect(sigHandlerMock.getAllCampaignSignals()).eql({});
      }

      function buildAndAddOffer(offer, monitorData) {
        const mo = buildMockOffer(offer, monitorData);
        mo.ui_info = offer.ui_info;
        odb.addOfferObject(mo.offer.offer_id, mo.offer);
        // Install own test version of monitors instead one of OfferDB
        omh.removeOfferMonitors(mo);
        omh.addOfferMonitors(mo);
        omh.build();
        return mo;
      }

      // expected: {
      //  activate: true | false,
      //  code: code,
      // }
      //
      function testShouldActivateOfferForUrl(url, expected) {
        const urlData = buildUrlData(url);
        const r = omh.shouldActivateOfferForUrl(urlData);
        chai.expect(r.activate).eql(expected.activate);
        if (expected.activate) {
          chai.expect(r.offerInfo.code).eql(expected.code);
          if (expected.autoFillField) {
            chai.expect(r.offerInfo.autoFillField).eql(expected.autoFillField);
          } else {
            chai.expect(r.offerInfo.autoFillField).eql(false);
          }
        }
        return r;
      }

      // { offerInfo, couponValue, urlData }
      function callCouponFormUsed(offerInfo, couponValue, url) {
        const args = {
          offerInfo,
          couponValue,
          urlData: buildUrlData(url),
        };
        omh.couponFormUsed(args);
      }

      beforeEach(function () {
        persistenceMocks['core/persistence/map'].reset();
        OffersMonitorHandler = this.module().default;

        return Promise.all([
          this.system.import('core/url'),
          this.system.import('offers-v2/common/pattern-utils'),
          this.system.import('offers-v2/offers/offers-db'),
        ]).then((mods) => {
          getDetailsFromUrlReal = mods[0].getDetailsFromUrl;
          buildMultiPatternIndex = mods[1].buildMultiPatternIndex;
          buildSimplePatternIndex = mods[1].buildSimplePatternIndex;
          tokenizeUrl = mods[1].default;
          OfferDB = mods[2].default;
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
          beforeEach(async function () {
            odb = new OfferDB();
            await ehMocks.init(this.system);
            evtHandlerMock = new EventHandlerMock();
            sigHandlerMock = new SignalHandler();
            omh = new OffersMonitorHandler(
              sigHandlerMock,
              odb,
              evtHandlerMock
            );
          });

          it('/one offer 1 simple url monitor not trigger for wrong urls', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com'],

            }];
            const evts = [
              { u: 'http://www.gooogle.com' },
              { u: 'http://www.yahoo.com' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google2.com' },
              { u: 'http://www.gooogle.com/google.com' },
            ];

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkNoSignals();
          });

          it('/one offer 1 with multiple signals monitors will be triggered properly', function () {
            const offer = mockOffer;
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

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            monitors.forEach(m => checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', m.signalID, 1));
          });

          it('/one offer 1 simple url monitor trigger proper urls', function () {
            const offer = mockOffer;
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

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
          });

          it('/ensure special characters with upper and lower case are matched always', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: [
                'hällö$fuzzy,domain=google.de',
                'àgüstï3n përęz$fuzzy,domain=google.de',
                '||google.de/search?*ällín*',
              ]
            }];
            const evts = [
              { u: 'https://google.de/H%C3%84ll%C3%B6' },
              { u: 'https://google.de/H%C3%84ll%C3%96' },
              { u: 'https://google.de/H%C3%A4ll%C3%B6' },
              { u: 'https://google.de/Häll' }, // this should not match the patterns
              { u: 'https://google.de/H%C3%A4ll' }, // this should not match the patterns
              { u: 'https://www.google.de/search?source=hp&ei=Vy-pWu_jL8LQkwWQyZDwBg&q=%C3%80g%C3%BCst%C3%AF3n+p%C3%8Br%C4%99z&oq=%C3%80g%C3%BCst%C3%AF3n+p%C3%8Br%C4%99z&gs_l=psy-ab.3...2196.40574.0.48408.41.31.10.0.0.0.242.4666.1j25j4.30.0....0...1c.1.64.psy-ab..1.27.3440...0j38j0i131k1j0i19k1j0i30i19k1j0i5i30i19k1j0i10i30i19k1j33i160k1.0.m0crLgRYbRA' },
              { u: 'https://www.google.de/search?client=firefox-b-ab&dcr=0&ei=jDaqWvqEB4PsUsLgvcgH&q=%C3%A4ll%C3%ADn&oq=%C3%A4ll%C3%ADn&gs_l=psy-ab.3..38l4.1020.1784.0.2102.3.3.0.0.0.0.144.418.0j3.3.0....0...1c.1.64.psy-ab..0.2.272....0.8wNlF5OJ1n4' },
            ];

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 5);
          });
          it('/ensure + matching to space', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: [
                // 'hello world$fuzzy,domain=google.de',
                'hello world$domain=google.de'
              ]
            }];
            const evts = [
              { u: 'https://google.de/?q=hello+world' },
              { u: 'https://google.de/?q=hello%20world' },
            ];

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 2);
          });
          it('/ensure %2B not matching to space', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: [
                'c++ test$domain=google.com',
              ]
            }];
            const evts = [
              { u: 'https://www.google.com/search?q=c%2B%2B+test' }
            ];

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
          });
          // /one offer N simple monitors works
          it('/one offer N simple monitors works', function () {
            const offer = mockOffer;
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

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
          });

          it('/SIMPLE buildMultiPatternIndex test', function () {
            const offers = [
              { offer_id: 'hc1', cid: 'cid', click: null, last_update: 20001, view: 20001 },
              { offer_id: 'hc2', cid: 'cid2', click: null, last_update: 20002, view: 20002 },
              { offer_id: 'hc3', cid: 'cid3', click: null, last_update: 20003, view: 20003 },
              { offer_id: 'hc4', cid: 'cid4', click: null, last_update: 20004, view: 20004 },
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
            const evts = [
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
              { offer_id: 'hc1', cid: 'cid', click: null, last_update: 20000, view: 2003 },
              { offer_id: 'hc2', cid: 'cid2', click: null, last_update: 20000, view: 2003 },
              { offer_id: 'hc3', cid: 'cid3', click: null, last_update: 20000, view: 2003 },
              { offer_id: 'hc4', cid: 'cid4', click: null, last_update: 20000, view: 2003 },
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

          // // ////////////////////////////////////////////////////////////////////
          // // filtered_last_secs tests:
          // // ////////////////////////////////////////////////////////////////////

          it('/present but value == 0 -> 3 consecutives times the same signal can be sent (same offer / campaign / signal)', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { filter_last_secs: 0 },
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
            ];

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 3);
          });

          it('/present-> 3 consecutive signals are not sent (same signal, cid)', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { filter_last_secs: 10 },
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
            ];

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
          });

          it('/present-> 2 consecutive signals are not sent (same signal, cid, different offers)', function () {
            const offer = mockOffer;
            const offer2 = { offer_id: 'HC2', cid: 'cid' };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { filter_last_secs: 10 },
              patterns: ['||google.de']
            }];
            const monitors2 = [{
              signalID: 's1',
              type: 'urlchange',
              params: { filter_last_secs: 10 },
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
            ];

            buildAndAddOffer(offer, monitors);
            buildAndAddOffer(offer2, monitors2);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);

            // clear and trigger again
            sigHandlerMock.clear();
            simulateEvents(evts);
            checkNoSignals();
          });

          it('/present-> 2 consecutive signals properly sent (different signal, same cid)', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { filter_last_secs: 10 },
              patterns: ['||google.de']
            }, {
              signalID: 's2',
              type: 'urlchange',
              params: { filter_last_secs: 10 },
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
            ];

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
          });

          it('/present-> 2 signals are sent if time threshold is bigger than argument', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: { filter_last_secs: 10 },
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de' },
            ];

            buildAndAddOffer(offer, monitors);
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
              { offer_id: 'HC1', cid: 'cid', last_update: Date.now() - 20, click: mockOffer.click, view: mockOffer.view },
              { offer_id: 'HC2', cid: 'cid2', last_update: Date.now() - 20, click: mockOffer.click, view: mockOffer.view },
              { offer_id: 'HC3', cid: 'cid3', last_update: Date.now() - 20, click: mockOffer.click, view: mockOffer.view },
              { offer_id: 'HC4', cid: 'cid4', last_update: Date.now(), click: mockOffer.click, view: mockOffer.view },
              // { offer_id: 'HC5', cid: 'cid-2' },
            ];
            const monitors = [];
            offers.forEach(() => {
              monitors.push([{
                signalID: 'sig',
                type: 'urlchange',
                params: { filter_last_secs: 10 },
                patterns: ['||google.de'],
              }]);
            });

            for (let i = 0; i < offers.length; i += 1) {
              const offer = offers[i];
              const monitorsData = monitors[i];
              buildAndAddOffer(offer, monitorsData);
            }

            const evts = [
              { u: 'http://www.google.de' },
            ];

            // only for HC4 from cid and HC5 from cid2 we get a signal
            simulateEvents(evts);
            checkNotExistCampaignSignal(offers[0].cid, offers[0].offer_id, 'trigger', 'sig');
            checkCampaignSignal(offers[0].cid, offers[0].offer_id, 'trigger', 'repeated_sig', 1);
            checkNotExistCampaignSignal(offers[1].cid, offers[1].offer_id, 'trigger', 'sig');
            checkCampaignSignal(offers[1].cid, offers[1].offer_id, 'trigger', 'repeated_sig', 1);
            checkNotExistCampaignSignal(offers[2].cid, offers[2].offer_id, 'trigger', 'sig');
            checkCampaignSignal(offers[2].cid, offers[2].offer_id, 'trigger', 'repeated_sig', 1);
            checkCampaignSignal(offers[3].cid, offers[3].offer_id, 'trigger', 'sig', 1);
            checkNotExistCampaignSignal(offers[3].cid, offers[3].offer_id, 'trigger', 'repeated_sig');
          });

          it('/remove an offer works', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: null,
              patterns: ['||google.com']
            }];
            const evts = [
              { u: 'http://www.google.com' },
            ];

            buildAndAddOffer(offer, monitors);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 's1', 1);

            // remove the offer and check we do not get anymore events
            sigHandlerMock.clear();
            omh.removeOfferMonitors(buildMockOffer(offer, monitors));
            omh.build();
            simulateEvents(evts);
            checkNoSignals();
          });

          it('/remove an offer doesnt affect others', function () {
            const offer = mockOffer;
            const offer2 = mockOfferEarlierUpdate;
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

            buildAndAddOffer(offer, monitors);
            buildAndAddOffer(offer2, monitors2);
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkNotExistCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
            // remove the offer and check we do not get anymore events
            sigHandlerMock.clear();
            omh.removeOfferMonitors(buildMockOffer(offer, monitors));
            omh.build();
            simulateEvents(evts);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
            checkNotExistCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID);
          });

          it('/add signals only for the last clicked campaign', function () {
            const offer = mockOffer;
            const offer2 = { offer_id: 'HC2', cid: 'cid2', last_update: mockOffer.last_update - 100, click: mockOffer.last_update, view: mockOffer.view - 100 };
            const monitors = [{
              signalID: 's1',
              type: 'urlchange',
              params: {},
              patterns: ['||google.de']
            }];
            const monitors2 = [{
              signalID: 's2',
              type: 'urlchange',
              params: {},
              patterns: ['||google.de']
            }];
            const evts = [
              { u: 'http://www.google.de' },
            ];
            buildAndAddOffer(offer, monitors);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkNotExistCampaignSignal(offer2.cid, offer.offer_id, 'trigger', monitors2[0].signalID);
            checkNotExistCampaignSignal(offer2.cid, offer.offer_id, 'trigger', `repeated_${monitors2[0].signalID}`);


            // remove the offer and check we do not get anymore events
            sigHandlerMock.clear();
            buildAndAddOffer(offer2, monitors2);
            simulateEvents(evts);
            checkNotExistCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', `repeated_${monitors[0].signalID}`, 1);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
            checkNotExistCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', `repeated_${monitors2[0].signalID}`);
          });

          // ///////////////////////////////////////////////////////////////////
          // Tests for webrequest
          //
          // - if no domain activation is hit no web request is measured
          // - if activation domain is hit web request is measured
          // - if domain activation is hit still webrequest will be triggered when match

          it('/webrequest: if no domain activation is hit no web request is measured', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/conversion']
            }];
            const evts = [
              { u: 'http://www.xyy.de' },
              { u: 'http://www.google.de/conversion', t: 'webrequest' },
            ];

            buildAndAddOffer(offer, monitors);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
          });

          it('/webrequest: if activation domain is hit web request is measured', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/conversion']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de/conversion', t: 'webrequest' },
            ];

            buildAndAddOffer(offer, monitors);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
          });

          it('/webrequest: if domain activation is hit still webrequest will be triggered when match', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/conversion']
            }];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de/noconversion', t: 'webrequest' },
            ];

            buildAndAddOffer(offer, monitors);

            simulateEvents(evts);
            checkNoSignals();
          });

          it('/webrequest: if activation domain is hit web request is measured for multiple monitors', function () {
            const offer = mockOffer;
            const monitors = [{
              signalID: 's1',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/conversion']
            }, {
              signalID: 's2',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/secondconversion']
            }
            ];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de/conversion', t: 'webrequest' },
              { u: 'http://www.google.de/secondconversion', t: 'webrequest' },
            ];

            buildAndAddOffer(offer, monitors);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
          });

          it('/webrequest: multiple offers with multiple monitors only sends signals for the last one', function () {
            const offer = mockOffer;
            const offer2 = mockOfferEarlierUpdate;
            const monitors = [{
              signalID: 's1',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/conversion']
            }, {
              signalID: 's2',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/secondconversion']
            }
            ];
            const monitors2 = [{
              signalID: 'amazons1',
              type: 'webrequest',
              domain: 'amazon.de',
              params: {},
              patterns: ['||amazon.de/conversion']
            }, {
              signalID: 'amazons2',
              type: 'webrequest',
              domain: 'amazon.de',
              params: {},
              patterns: ['||amazon.de/secondconversion']
            }
            ];
            let evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de/conversion', t: 'webrequest' },
              { u: 'http://www.google.de/secondconversion', t: 'webrequest' },
            ];

            buildAndAddOffer(offer, monitors);
            buildAndAddOffer(offer2, monitors2);

            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
            checkNotExistCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID);
            checkNotExistCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[1].signalID);

            // now trigger second offer
            evts = [
              { u: 'http://www.amazon.de' },
              { u: 'http://www.amazon.de/conversion', t: 'webrequest' },
              { u: 'http://www.amazon.de/secondconversion', t: 'webrequest' },
            ];

            sigHandlerMock.clear();
            simulateEvents(evts);
            checkNotExistCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID);
            checkNotExistCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[1].signalID, 1);
          });

          it('/webrequest: adding monitors once after other works', function () {
            const offer = mockOffer;
            const offer2 = { offer_id: 'HC2', cid: 'cid2', last_update: mockOffer.last_update + 100, click: 0, view: 0 };
            const monitors = [{
              signalID: 's1',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/conversion']
            }, {
              signalID: 's2',
              type: 'webrequest',
              domain: 'google.de',
              params: {},
              patterns: ['||google.de/secondconversion']
            }
            ];
            const monitors2 = [{
              signalID: 's1',
              type: 'webrequest',
              domain: 'amazon.de',
              params: {},
              patterns: ['||amazon.de/conversion']
            }, {
              signalID: 's2',
              type: 'webrequest',
              domain: 'amazon.de',
              params: {},
              patterns: ['||amazon.de/secondconversion']
            }
            ];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.google.de/conversion', t: 'webrequest' },
              { u: 'http://www.google.de/secondconversion', t: 'webrequest' },
              { u: 'http://www.amazon.de' },
              { u: 'http://www.amazon.de/conversion', t: 'webrequest' },
              { u: 'http://www.amazon.de/secondconversion', t: 'webrequest' },
            ];

            buildAndAddOffer(offer, monitors);


            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
            checkNotExistCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
            checkNotExistCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[1].signalID, 1);

            // now trigger second offer
            buildAndAddOffer(offer2, monitors2);

            sigHandlerMock.clear();
            simulateEvents(evts);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[0].signalID, 1);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', monitors[1].signalID, 1);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[0].signalID, 1);
            checkCampaignSignal(offer2.cid, offer2.offer_id, 'trigger', monitors2[1].signalID, 1);
          });

          // ////////////////////////////////////////////////////////////////////////////////
          //                COUPONS USAGE TESTS
          // ////////////////////////////////////////////////////////////////////////////////
          //
          // Since this is tricky to test because we do not have a way to inject the
          // scripts here, we will only test if given a list of coupon monitors we
          // are properly returning the values for:
          //  - shouldActivateOfferForUrl
          //  - couponFormUsed
          // interfaces
          //

          it('/coupon: shouldActivateOfferForUrl on invalid urls works', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } }, click: null, last_update: 20000, view: 2003 };
            const monitors = [{
              signalID: 's1',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate1',
                '||google.de/activate_second',
                '||google.de/activate_third',
              ],
              couponInfo: {},
            }
            ];
            const evts = [
              { u: 'http://www.google.de' },
              { u: 'http://www.amazon.de' },
            ];

            // for all urls we expect to not match
            buildAndAddOffer(offer, monitors);
            evts.forEach((e) => {
              const url = e.u;
              testShouldActivateOfferForUrl(url, { activate: false });
            });
          });

          it('/coupon: shouldActivateOfferForUrl on valid urls works', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } }, click: null, last_update: 20000, view: 2003 };
            const monitors = [{
              signalID: 's1',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate1',
                '||google.de/activate_second',
                '||google.de/activate_third',
              ],
              couponInfo: {},
            }
            ];
            const evts = [
              { u: 'http://www.google.de/activate1' },
              { u: 'http://www.google.de/activate_second' },
              { u: 'http://www.google.de/activate_third' },
            ];

            // for all urls we expect to not match
            buildAndAddOffer(offer, monitors);
            evts.forEach((e) => {
              const url = e.u;
              testShouldActivateOfferForUrl(url, { activate: true, code: 'TEST_CODE' });
            });
          });

          it('/coupon: shouldActivateOfferForUrl on valid urls works on multiple offers', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } } };
            const offer2 = { offer_id: 'HC2', cid: 'cid2', ui_info: { template_data: { code: 'TEST_CODE2' } } };
            const monitors = [{
              signalID: 's1',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate_second',
              ],
              couponInfo: {},
            }
            ];
            const monitors2 = [{
              signalID: 's2',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate_third',
              ],
              couponInfo: {},
            }
            ];
            buildAndAddOffer(offer, monitors);
            buildAndAddOffer(offer2, monitors2);
            testShouldActivateOfferForUrl('http://www.google.de/activate_second',
              { activate: true, code: 'TEST_CODE' });
            testShouldActivateOfferForUrl('http://www.google.de/activate_third',
              { activate: true, code: 'TEST_CODE2' });
          });

          it('/coupon: couponFormUsed works for proper coupon code', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } } };
            const monitors = [{
              signalID: 's1',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate_second',
              ],
              couponInfo: {},
            }
            ];
            buildAndAddOffer(offer, monitors);

            const url = 'http://www.google.de/activate_second';
            const r1 = testShouldActivateOfferForUrl(url,
              { activate: true, code: 'TEST_CODE' });
            callCouponFormUsed(r1.offerInfo, 'TEST_CODE', url);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'coupon_own_used', 1);
          });

          it('/coupon: couponFormUsed works for different coupon code', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } } };
            const monitors = [{
              signalID: '_coupon_',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate_second',
              ],
              couponInfo: {},
            }
            ];
            buildAndAddOffer(offer, monitors);
            const url = 'http://www.google.de/activate_second';
            const r1 = testShouldActivateOfferForUrl(url,
              { activate: true, code: 'TEST_CODE' });
            callCouponFormUsed(r1.offerInfo, 'TEasdaST_CODasdaE', url);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'coupon_other_used', 1);
          });

          it('/coupon: couponFormUsed works for no coupon code', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } } };
            const monitors = [{
              signalID: '-',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate_second',
              ],
              couponInfo: {},
            }
            ];
            buildAndAddOffer(offer, monitors);
            const url = 'http://www.google.de/activate_second';
            const r1 = testShouldActivateOfferForUrl(url,
              { activate: true, code: 'TEST_CODE' });
            callCouponFormUsed(r1.offerInfo, '', url);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'coupon_empty', 1);
          });

          it('/coupon: should not show autofill pop up due to no recent interaction', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } }, click: null, last_update: 20000 };
            offer.view = 2003;
            const monitors = [{
              signalID: '-',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate_second',
              ],
              couponInfo: { autoFillField: true },
            }
            ];
            buildAndAddOffer(offer, monitors);
            const url = 'http://www.google.de/activate_second';
            const r1 = testShouldActivateOfferForUrl(url,
              { activate: true, code: 'TEST_CODE', autoFillField: false });
            callCouponFormUsed(r1.offerInfo, '', url);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'coupon_empty', 1);
          });

          it('/coupon: should show autofill pop up', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } }, click: null, last_update: 20000 };
            offer.view = Date.now() - 1000 * 60 * 20; // Small amount of time, f.e. 20 minutes
            const monitors = [{
              signalID: '-',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate_second',
              ],
              couponInfo: { autoFillField: true },
            }
            ];
            buildAndAddOffer(offer, monitors);
            const url = 'http://www.google.de/activate_second';
            const r1 = testShouldActivateOfferForUrl(url,
              { activate: true, code: 'TEST_CODE', autoFillField: true });
            callCouponFormUsed(r1.offerInfo, '', url);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'coupon_empty', 1);
          });

          it('/coupon: should not show autofill pop up due to backend setting', function () {
            const offer = { offer_id: 'HC1', cid: 'cid', ui_info: { template_data: { code: 'TEST_CODE' } }, click: null, last_update: 20000, view: 1543231629086 };
            const monitors = [{
              signalID: '-',
              type: 'coupon',
              params: {},
              patterns: [
                '||google.de/activate_second',
              ],
              couponInfo: { autoFillField: false },
            }
            ];
            buildAndAddOffer(offer, monitors);
            const url = 'http://www.google.de/activate_second';
            const r1 = testShouldActivateOfferForUrl(url,
              { activate: true, code: 'TEST_CODE', autoFillField: false });
            callCouponFormUsed(r1.offerInfo, '', url);
            checkCampaignSignal(offer.cid, offer.offer_id, 'trigger', 'coupon_empty', 1);
          });
        });
      });
    });
  });
