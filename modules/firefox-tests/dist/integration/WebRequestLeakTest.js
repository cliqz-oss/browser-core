"use strict";

DEPS.WebRequestLeakTest = ["core/utils"];
TESTS.WebRequestLeakTest = function(CliqzUtils) {
  var System = CliqzUtils.getWindow().CLIQZ.System,
      webrequest = System.get('core/webrequest').default;

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

    beforeEach( function() {
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
    });

    afterEach( function() {
      webrequest.onBeforeRequest.removeListener( onBeforeRequestCtr );
      webrequest.onBeforeSendHeaders.removeListener( onBeforeHeadersCtr );
      webrequest.onHeadersReceived.removeListener( onHeadersReceiveCtr );
    });

    it('does not leak requests across pages', function(done) {
      var baseUrl = 'http://localhost:' + testServer.port
      var page1 = baseUrl + '/leaktest.html';
      var page2 = baseUrl + '/thirdpartyscript.html';

      var tab = gBrowser.addTab(page1);
      setTimeout(function() {
        gBrowser.getBrowserForTab(tab).loadURI(page2);
        setTimeout(function() {
          for(var ind in onBeforeRequest) {
            var req = onBeforeRequest[ind];
            if(req.url.endsWith('test')) { // this is the onunload request in page1
              chai.expect(req.originUrl).to.equal(page1);
              chai.expect(req.source).to.equal(page1);
            } else if(req.url.endsWith('2E85855CF4C75134')) { // this is a request from page2
              chai.expect(req.originUrl).to.equal(page2);
              chai.expect(req.source).to.equal(page2);
            }
          }
          done();
        }, 300);
      }, 500);
    });

    it('does not leak iframe request across pages', function(done) {
      var baseUrl = 'http://localhost:' + testServer.port
      var page1 = baseUrl + '/leaktestiframe.html';
      var page2 = baseUrl + '/thirdpartyscript.html';
      var iframe = baseUrl + '/leaktest.html';

      var tab = gBrowser.addTab(page1);
      setTimeout(function() {
        gBrowser.getBrowserForTab(tab).loadURI(page2);
        setTimeout(function() {
          for(var ind in onBeforeRequest) {
            var req = onBeforeRequest[ind];
            console.log(req);
            if(req.url.endsWith('test')) { // this is the onunload request in page1
              chai.expect(req.originUrl).to.equal(iframe);
              // TODO: get this to properly resolve previous page
              chai.expect(req.source).to.equal(iframe);
            } else if(req.url.endsWith('2E85855CF4C75134')) { // this is a request from page2
              chai.expect(req.originUrl).to.equal(page2);
              chai.expect(req.source).to.equal(page2);
            }
          }
          done();
        }, 300);
      }, 500);
    })
  });
}