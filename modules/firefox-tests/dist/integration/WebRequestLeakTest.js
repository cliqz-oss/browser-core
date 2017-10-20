"use strict";
/* globals waitFor, chai, DEPS, TESTS, CliqzUtils */


DEPS.WebRequestLeakTest = ["core/utils"];
TESTS.WebRequestLeakTest = function(CliqzUtils) {
  var System = CliqzUtils.getWindow().CLIQZ.System,
      webrequest = System.get('core/webrequest').default;
  var browser = System.get('platform/browser');
  var baseUrl = 'http://localhost:' + testServer.port;


  describe('WebRequest Leak Test', function() {

    var onBeforeRequest = [],
        onBeforeSendHeaders = [],
        onHeadersReceived = [];
    var gBrowser = CliqzUtils.getWindow().gBrowser;
    var hitCtr = 0;

    function onBeforeRequestCtr(req) {
      onBeforeRequest.push(req);
    }
    function onBeforeHeadersCtr(req) {
      onBeforeSendHeaders.push(req);
    }
    function onHeadersReceiveCtr(req) {
      onHeadersReceived.push(req);
    }

    function setupTabs(page1, page2) {
      return browser.newTab(page1)
      .then(tab =>
        waitFor(() => onBeforeRequest.some(req => req.url.endsWith('leaktest.html')))
          .then(() => browser.updateTab(tab, page2))
      )
      .then(() =>
        waitFor(() => onBeforeRequest.some(req => req.url.endsWith('2E85855CF4C75134')))
      );
    }

    beforeEach(function (done) {
      onBeforeRequest = [];
      onBeforeSendHeaders = [];
      onHeadersReceived = [];
      hitCtr = 0;
      webrequest.onBeforeRequest.addListener( onBeforeRequestCtr );
      webrequest.onBeforeSendHeaders.addListener( onBeforeHeadersCtr );
      webrequest.onHeadersReceived.addListener( onHeadersReceiveCtr );

      testServer.registerDirectory('/', ['firefox-tests', 'mockserver']);
      testServer.registerPathHandler('/test', function(request, response) {
        hitCtr += 1;
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        response.write("{}");
      });

      return wait_until_server_up(baseUrl, 10, function () { done(); });
    });

    afterEach( function() {
      webrequest.onBeforeRequest.removeListener( onBeforeRequestCtr );
      webrequest.onBeforeSendHeaders.removeListener( onBeforeHeadersCtr );
      webrequest.onHeadersReceived.removeListener( onHeadersReceiveCtr );
    });

    it('does not leak requests across pages', function() {
      var page1 = baseUrl + '/leaktest.html';
      var page2 = baseUrl + '/thirdpartyscript.html';

      return setupTabs(page1, page2).then(function () {
        for(var ind in onBeforeRequest) {
          var req = onBeforeRequest[ind];
          if(req.url.endsWith('test')) { // this is the onunload request in page1
            chai.expect(req.originUrl).to.equal(page1);
            chai.expect(req.sourceUrl).to.equal(page1);
          } else if(req.url.endsWith('2E85855CF4C75134')) { // this is a request from page2
            chai.expect(req.originUrl).to.equal(page2);
            chai.expect(req.sourceUrl).to.equal(page2);
          }
        }
      });
    });

    it('does not leak iframe request across pages', function () {
      var page1 = baseUrl + '/leaktestiframe.html';
      var page2 = baseUrl + '/thirdpartyscript.html';
      var iframe = baseUrl + '/leaktest.html';

      return setupTabs(page1, page2).then(function () {
        for(var ind in onBeforeRequest) {
          var req = onBeforeRequest[ind];
          console.log(req);
          if(req.url.endsWith('test')) { // this is the onunload request in page1
            chai.expect(req.originUrl).to.equal(iframe);
            // TODO: get this to properly resolve previous page
            chai.expect(req.sourceUrl).to.equal(iframe);
          } else if(req.url.endsWith('2E85855CF4C75134')) { // this is a request from page2
            chai.expect(req.originUrl).to.equal(page2);
            chai.expect(req.sourceUrl).to.equal(page2);
          }
        }
      });
    })
  });
}
