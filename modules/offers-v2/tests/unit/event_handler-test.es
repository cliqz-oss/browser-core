/* global chai */
/* global describeModule */
/* global require */

let getDetailsFromUrlReal;

export default describeModule('offers-v2/event_handler',
  () => ({
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: (x) => {console.log(x);},
        error: (x) => {console.log(x);},
        info: (x) => {console.log(x);},
        log: (x) => {console.log(x);},
        warn: (x) => {console.log(x);},
        logObject: () => {console.log(x);},
      }
    },
    'core/platform': {
      isChromium: false
    },
    'core/cliqz': {
      utils: {
        setTimeout: function(f, t) {
          f();
        },
        setInterval: function () {},
        getDetailsFromUrl: function(url) {
          // we should extract the name here
          return getDetailsFromUrlReal(url);
        }
      },
      events: {
        d: {
          id_map: {}
        },
        sub: function(id, cb) {
          this.d.id_map[id] = cb;
        },
        un_sub: function(id, cb) {
          delete this.d.id_map[id];
        },
        pub: function(id, ...args) {
          const cb = this.d.id_map[id];
          if (cb) {
            cb(...args);
          }
        },
        clear: function() {
          this.d.id_map = {};
        }
      }
    },
    'core/webrequest': {
      default: {
        onBeforeRequest: {
          d: [],
          removeListener: function(cb) {
            const idx = this.d.indexOf(cb);
            if (idx >= 0) {
              this.d.splice(idx,1);
            }
          },
          addListener: function(cb, args) {
            this.d.push(cb);
          },
          mock_pub: function(requestObj) {
            this.d.forEach(cb => cb(requestObj));
          },
          clear: function () {
            this.d = [];
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
    'core/prefs': {
      default: {
        get: function(x,y) { return y; }
      }
    }
  }),
  () => {
    describe('#event_handler', function() {
      let EventHandler;
      let events;
      let WebRequest;
      beforeEach(function () {
        EventHandler = this.module().default;
        events = this.deps('core/cliqz').events;
        WebRequest = this.deps('core/webrequest').default;
        return this.system.import('core/url').then((mod) => {
          getDetailsFromUrlReal = mod.getDetailsFromUrl;
        })
      });

      context('basic tests', function () {
        let eh;

        beforeEach(function () {
          events.clear();
          WebRequest.onBeforeRequest.clear();
          eh = new EventHandler();
        });

        function simLocChange(url) {
          const evt = {
            isPrivate: false,
            isSameDocument: false,
            url
          };
          events.pub('content:location-change', evt);
        }

        function simReq(url) {
          const evt = {
            rul: url,
            url,
          }
          WebRequest.onBeforeRequest.mock_pub(evt);
        }

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/test event handler exists', function () {
          chai.expect(eh).to.exist;
        });

        it('/url change event calls appropiate callback', function () {
          let counter = 0;
          const cb = (urlData, args) => {
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
          eh.subscribeUrlChange(cb, {x:1, y: 2, z: 3});
          simLocChange('http://www.amazon.com/');
          chai.expect(counter).eql(1);
          chai.expect(lastUrlData).to.exist;
          chai.expect(lastUrlData.getRawUrl()).eql('http://www.amazon.com/');
          chai.expect(lastUrlData.getDomain()).eql('amazon.com');
          chai.expect(lastArgs).eql({x:1, y: 2, z: 3});
        });

        it('/http request subscribe/unsubscribeHttpReq works', function () {
          let counter = 0;
          let lastArgs = null;
          const cb = (args) => {
            counter += 1;
            lastArgs = args;
          };
          chai.expect(eh.isHttpReqDomainSubscribed(cb, 'amazon.com')).eql(false);
          eh.subscribeHttpReq(cb, 'amazon.com', {x:1, y: 2, z: 3});
          chai.expect(eh.isHttpReqDomainSubscribed(cb, 'amazon.com')).eql(true);
          eh.unsubscribeHttpReq(cb, 'amazon.com');
          chai.expect(eh.isHttpReqDomainSubscribed(cb, 'amazon.com')).eql(false);
        });

        it('/http request is called properly', function () {
          let counter = 0;
          let lastArgs = null;
          const cb = (args) => {
            counter += 1;
            lastArgs = args;
          };
          eh.subscribeHttpReq(cb, 'amazon.com', {x:1, y: 2, z: 3});
          simReq('http://www.amazon.com');
          chai.expect(counter).eql(1);
          simReq('http://www.amazon.com');
          chai.expect(counter).eql(2);
        });

        it('/http request is not called if unsubcribed', function () {
          let counter = 0;
          let lastArgs = null;
          const cb = (args) => {
            counter += 1;
            lastArgs = args;
          };
          eh.subscribeHttpReq(cb, 'amazon.com', {x:1, y: 2, z: 3});
          simReq('http://www.amazon.com');
          chai.expect(counter).eql(1);
          eh.unsubscribeHttpReq(cb, 'amazon.com');
          simReq('http://www.amazon.com');
          chai.expect(counter).eql(1);
        });


        it('/http request is not called for different domain', function () {
          let counter = 0;
          let lastArgs = null;
          const cb = (args) => {
            counter += 1;
            lastArgs = args;
          };
          eh.subscribeHttpReq(cb, 'quasiamazon.com', {x:1, y: 2, z: 3});
          simReq('http://www.amazon.com');
          simReq('http://www.come.quasiamazon2.com');
          simReq('http://www.come.amazon2quasi.com/pepe');
          chai.expect(counter).eql(0);
        });


      });
    });
  }
);
