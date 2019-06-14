/* global chai */
/* global describeModule */
/* global require */
/* global sinon */

const commonMocks = require('./utils/common');
const eventsMock = require('./utils/events');

let getDetailsFromUrlReal;

export default describeModule('offers-v2/event_handler',
  () => ({
    ...commonMocks,
    ...eventsMock,
    'core/url': {
      getDetailsFromUrl: function (url) {
        // we should extract the name here
        return getDetailsFromUrlReal(url);
      }
    },
    'core/timers': {
      setTimeout: cb => cb(),
    },
  }),
  () => {
    describe('#event_handler', function () {
      let EventHandler;
      const events = eventsMock['core/events'].default;
      beforeEach(function () {
        EventHandler = this.module().default;
        events.clearAll();
        return this.system.import('core/url').then((mod) => {
          getDetailsFromUrlReal = mod.getDetailsFromUrl;
        });
      });

      context('basic tests', function () {
        let eh;

        beforeEach(function () {
          eh = new EventHandler();
        });

        function simLocChange(url, extra = {}) {
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
              simLocChange(`http://smwhr.com/${letter}`, { tabId: letter }));
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
            doActivityInOtherTabs('012345');

            cb.resetHistory();
            loadInMainTab();

            chai.expect(cb.callCount).eql(0);
          });

          it('/miss a reload due to expiration of url tracking entries', () => {
            loadInMainTab();
            doActivityInOtherTabs('0123456789ABCDEFGHIJKLMNOPQRST');

            cb.resetHistory();
            loadInMainTab();

            chai.expect(cb.callCount).eql(1);
          });
        });
      });
    });
  });
