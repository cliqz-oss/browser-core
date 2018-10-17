/* global chai */
/* global describeModule */
/* global require */
/* global sinon */

const encoding = require('text-encoding');
const tldjs = require('tldjs');

const TextDecoder = encoding.TextDecoder;
const TextEncoder = encoding.TextEncoder;

let getDetailsFromUrlReal;

export default describeModule('offers-v2/event_handler',
  () => ({
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: (x) => { console.log(x); },
        error: (x) => { console.log(x); },
        info: (x) => { console.log(x); },
        log: (x) => { console.log(x); },
        warn: (x) => { console.log(x); },
        logObject: (x) => { console.log(x); },
      }
    },
    'core/platform': {
      isChromium: false
    },
    'core/helpers/timeout': {
      default: function () { const stop = () => {}; return { stop }; }
    },
    'core/utils': {
      default: {},
    },
    'core/url': {
      getDetailsFromUrl: function (url) {
        // we should extract the name here
        return getDetailsFromUrlReal(url);
      }
    },
    'core/events': {
      default: {
        d: {
          id_map: {}
        },
        sub: function (id, cb) {
          this.d.id_map[id] = cb;
        },
        un_sub: function (id) {
          delete this.d.id_map[id];
        },
        pub: function (id, ...args) {
          const cb = this.d.id_map[id];
          if (cb) {
            cb(...args);
          }
        }
      }
    },
    'platform/globals': {
    },
    // 'core/crypto/random': {
    // },
    'platform/console': {
      default: {}
    },
    'platform/lib/tldjs': {
      default: tldjs,
    },
    'core/prefs': {
      default: {
        get: function (x, y) { return y; }
      }
    }
  }),
  () => {
    describe('#event_handler', function () {
      let EventHandler;
      let events;
      beforeEach(function () {
        EventHandler = this.module().default;
        events = this.deps('core/events').default;
        return this.system.import('core/url').then((mod) => {
          getDetailsFromUrlReal = mod.getDetailsFromUrl;
        });
      });

      context('basic tests', function () {
        let oldTimeout;
        let eh;

        beforeEach(function () {
          eh = new EventHandler();
          oldTimeout = global.setTimeout;
          global.setTimeout = (cb) => { cb(); };
        });

        afterEach(function () {
          global.setTimeout = oldTimeout;
        });

        function simLocChange(url, extra={}) {
          const evt = {
            ...extra,
            isPrivate: false,
            isSameDocument: false,
            url
          };
          events.pub('content:location-change', evt);
        }

        function simReq(url) {
          const webRequestContext = {
            rul: url,
            url,
            isPrivate: false,
            statusCode: 200,
            typeInt: 6
          };
          // we will here simulate the callback of the webrequest directly,
          // still the logic will be the same
          eh.webrequestPipelineCallback(webRequestContext);
        }

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/test event handler exists', function () {
          chai.expect(eh).to.exist;
        });

        it('/url change event calls appropiate callback', function () {
          let counter = 0;
          const cb = () => {
            counter += 1;
          };
          eh.subscribeUrlChange(cb, null);
          simLocChange('http://www.amazon.com/');
          chai.expect(counter).eql(1);
        });

        it('/url change event calls appropiate callback with proper arguments', function () {
          let counter = 0;
          let lastUrlData = null;
          let lastArgs = null;
          const cb = (urlData, args) => {
            counter += 1;
            lastUrlData = urlData;
            lastArgs = args;
          };
          eh.subscribeUrlChange(cb, { x: 1, y: 2, z: 3 });
          simLocChange('http://www.amazon.com/');
          chai.expect(counter).eql(1);
          chai.expect(lastUrlData).to.exist;
          chai.expect(lastUrlData.getRawUrl()).eql('http://www.amazon.com/');
          chai.expect(lastUrlData.getDomain()).eql('amazon.com');
          chai.expect(lastArgs).eql({ x: 1, y: 2, z: 3 });
        });

        it('/http request subscribe/unsubscribeHttpReq works', function () {
          const cb = () => {};
          chai.expect(eh.isHttpReqDomainSubscribed(cb, 'amazon.com')).eql(false);
          eh.subscribeHttpReq(cb, 'amazon.com', { x: 1, y: 2, z: 3 });
          chai.expect(eh.isHttpReqDomainSubscribed(cb, 'amazon.com')).eql(true);
          eh.unsubscribeHttpReq(cb, 'amazon.com');
          chai.expect(eh.isHttpReqDomainSubscribed(cb, 'amazon.com')).eql(false);
        });

        it('/http request is called properly', function () {
          let counter = 0;
          const cb = () => {
            counter += 1;
          };
          eh.subscribeHttpReq(cb, 'amazon.com', { x: 1, y: 2, z: 3 });
          simReq('http://www.amazon.com');
          chai.expect(counter).eql(1);
          simReq('http://www.amazon.com');
          chai.expect(counter).eql(2);
        });

        it('/http request is not called if unsubcribed', function () {
          let counter = 0;
          const cb = () => {
            counter += 1;
          };
          eh.subscribeHttpReq(cb, 'amazon.com', { x: 1, y: 2, z: 3 });
          simReq('http://www.amazon.com');
          chai.expect(counter).eql(1);
          eh.unsubscribeHttpReq(cb, 'amazon.com');
          simReq('http://www.amazon.com');
          chai.expect(counter).eql(1);
        });


        it('/http request is not called for different domain', function () {
          let counter = 0;
          const cb = () => {
            counter += 1;
          };
          eh.subscribeHttpReq(cb, 'quasiamazon.com', { x: 1, y: 2, z: 3 });
          simReq('http://www.amazon.com');
          simReq('http://www.come.quasiamazon2.com');
          simReq('http://www.come.amazon2quasi.com/pepe');
          chai.expect(counter).eql(0);
        });

        context('/avoid emiting a location change event on a reload', () => {
          let cb;

          beforeEach(() => {
            cb = sinon.spy();
            eh.subscribeUrlChange(cb, null);
          });

          afterEach(() => {
            eh.unsubscribeUrlChange(cb);
          });

          function doActivityInOtherTabs(countString) {
            Array.from(countString).forEach(letter =>
              simLocChange('http://smwhr.com/' + letter, { tabId: letter }));
          }

          function loadInMainTab() {
            simLocChange('http://smwhr.com', { tabId: 'testtab' });
          }

          it('/detect an immediate reload', () => {
            loadInMainTab();

            cb.resetHistory();
            loadInMainTab();

            chai.expect(cb.callCount).eql(0);
          });

          it('/detect a reload after activity in other tabs', () => {
            loadInMainTab();
            doActivityInOtherTabs("012345");

            cb.resetHistory();
            loadInMainTab();

            chai.expect(cb.callCount).eql(0);
          });

          it('/miss a reload due to expiration of url tracking entries', () => {
            loadInMainTab();
            doActivityInOtherTabs("0123456789ABCDEFGHIJKLMNOPQRST");

            cb.resetHistory();
            loadInMainTab();

            chai.expect(cb.callCount).eql(1);
          });
        });
      });
    });
  }
);
