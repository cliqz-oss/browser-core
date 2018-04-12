
function helloWorld(request, response) {
  response.write('<html><body><p>Hello world</p></body></html');
}

DEPS.WebRequestTest = ["core/utils"];
TESTS.WebRequestTest = function(CliqzUtils) {
  var webrequest = getModule('core/webrequest').default;
  var browser = getModule('core/browser');

  describe('WebRequest', function() {
    var onBeforeRequest = [],
        onBeforeSendHeaders = [],
        onHeadersReceived = [];

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
      webrequest.onBeforeRequest.addListener( onBeforeRequestCtr );
      webrequest.onBeforeSendHeaders.addListener( onBeforeHeadersCtr );
      webrequest.onHeadersReceived.addListener( onHeadersReceiveCtr );
    });

    afterEach( function() {
      webrequest.onBeforeRequest.removeListener( onBeforeRequestCtr );
      webrequest.onBeforeSendHeaders.removeListener( onBeforeHeadersCtr );
      webrequest.onHeadersReceived.removeListener( onHeadersReceiveCtr );
    });

    context.skip('http GET request (Not visible from WebExtension)', function() {

      var url = 'http://localhost:' + testServer.port + '/';

      beforeEach( function(done) {
        testServer.registerPathHandler('/', helloWorld);
        CliqzUtils.httpGet(url, () => { done(); }, done, 30 * 1000);
      });

      it('calls each topic once', function() {
        for (var topic of [onBeforeRequest, onBeforeSendHeaders, onHeadersReceived]) {
          var reqs = topic.filter( function(req) { return req.url === url });
          chai.expect(reqs.length).to.eql(1);

          var req = reqs[0];
          console.log(req);
          chai.expect(req.method).to.equal('GET');
          chai.expect(req.tabId).to.equal(-1);
          chai.expect(req.type).to.equal(11);
        }
      });

      it('gives the response code only on headers received', function() {
        for (var topic of [onBeforeRequest, onBeforeSendHeaders]) {
          var reqs = topic.filter( function(req) { return req.url === url });
          var req = reqs[0];
          chai.expect(req.statusCode).to.be.undefined;
        }
        var req = onHeadersReceived.filter( function(req) { return req.url === url })[0];
        chai.expect(req.statusCode).to.equal(200);
      });

    });

    context('page loaded in tab', function() {

      var url = 'http://cliqztest.com:' + testServer.port + '/';

      beforeEach(function(done) {
        testServer.registerPathHandler('/', helloWorld);
        var tabLoaded = (r) => {
          if (r.url === url) {
            webrequest.onHeadersReceived.removeListener(tabLoaded);
            done();
          }
        }
        webrequest.onHeadersReceived.addListener(tabLoaded, { urls: ['http://*'] });
        browser.newTab(url);
      });

      it('calls each topic once', function() {
        this.timeout(30000);
        for (var topic of [onBeforeRequest, onBeforeSendHeaders, onHeadersReceived]) {
          var reqs = topic.filter( function(req) { return req.url === url });
          console.log(reqs);
          chai.expect(reqs.length).to.eql(1);

          var req = reqs[0];
          console.log(req);
          chai.expect(req.method).to.equal('GET');
          chai.expect(req.type).to.equal('main_frame');
        }
      });

      it('gives the response code only on headers received', function() {
        for (var topic of [onBeforeRequest, onBeforeSendHeaders]) {
          var reqs = topic.filter( function(req) { return req.url === url });
          var req = reqs[0];
          chai.expect(req.statusCode).to.be.undefined;
        }
        var req = onHeadersReceived.filter( function(req) { return req.url === url })[0];
        chai.expect(req.statusCode).to.equal(200);
      });

      it('all listeners get same tabId', function() {
        var req = onBeforeRequest.filter( function(req) { return req.url === url })[0];
        var tabId = req.tabId;

        for (var topic of [onBeforeSendHeaders, onHeadersReceived]) {
          var reqs = topic.filter( function(req) { return req.url === url });
          var req = reqs[0];
          chai.expect(req.tabId).to.equal(tabId);
        }
      });

    });

    context('listener returns cancel', function() {
      var requestSeen = false;
      var serverHit = false;
      var url = 'http://localhost:' + testServer.port + '/block';
      var block = function(req) {
        if (req.url === url) {
          requestSeen = true;
          return { cancel: true };
        }
      };

      beforeEach( function() {
        testServer.registerPathHandler('/block', function(req, resp) {
          serverHit = true;
          helloWorld(req, resp);
        });
        webrequest.onBeforeRequest.addListener(block, { urls: ['http://*'] }, ['blocking']);
        requestSeen = false;
        serverHit = false;
      });

      afterEach( function() {
        webrequest.onBeforeRequest.removeListener(block);
      });

      it('blocks the http request', function() {
        return browser.newTab(url, false)
          .then(() => waitFor(() => requestSeen))
          .then(function() {
            chai.expect(serverHit).to.be.false;
            // subsequent topics do not see request
            for (var topic of [onBeforeSendHeaders, onHeadersReceived]) {
              var reqs = topic.filter(req => req.url === url);
              chai.expect(reqs.length).to.eql(0);
            }
          });
      });
    });

    context('listener returns redirectUrl', function() {

      var requestSeen = false;
      var baseUrl = 'http://localhost:' + testServer.port
      var hitBase = false;
      var hitRedirect = false;
      var redirect = function(req) {
        if (req.url.indexOf(baseUrl) !== -1 && req.url.indexOf('redirected') === -1) {
          requestSeen = true;
          return {redirectUrl: baseUrl + '/redirected'};
        }
      };

      beforeEach( function() {
        webrequest.onBeforeRequest.addListener(redirect, { urls: ['http://*/*'] }, ['blocking']);
        testServer.registerPathHandler('/', function(req, resp) {
          hitBase = true;
          helloWorld(req, resp);
        });
        testServer.registerPathHandler('/redirected', function(req, resp) {
          hitRedirect = true;
          helloWorld(req, resp);
        });
      });

      afterEach( function() {
        webrequest.onBeforeRequest.removeListener(redirect);
      });

      it('redirects to specified url', function() {
        requestSeen = false;
        return browser.newTab(baseUrl + '/').then(function () {
          return waitFor(function() {
            return requestSeen && hitRedirect;
          }).then(function() {
            chai.expect(hitBase).to.be.false;
            chai.expect(hitRedirect).to.be.true;
          });
        });
      });

    });

    context('listener returns requestHeaders', function() {

      var requestSeen = false;
      var url = 'http://localhost:' + testServer.port + '/';
      var changeHeaders = function(req) {
        if (req.url === url && !requestSeen) {
          requestSeen = true;
          const newHeaders = [...req.requestHeaders];
          // add a header
          newHeaders.push({
            name: 'newheader',
            value: 'test'
          });
          // modify a header
          const changeHeader = 'user-agent';
          const index = newHeaders.findIndex(h => h.name.toLowerCase() === changeHeader);
          newHeaders[index] = {
            name: changeHeader,
            value: 'Cliqz',
          };
          // remove a header
          newHeaders.splice(newHeaders.findIndex((h => h.name.toLowerCase() === 'accept-language')), 1);
          return {
            requestHeaders: newHeaders
          };
        }
      };

      var headers = null;
      var collectHeaders = function(request, response) {
        var header_iter = request.headers;
        headers = {};

        while(header_iter.hasMoreElements()) {
          var header_name = header_iter.getNext().toString();
          headers[header_name] = request.getHeader(header_name);
        }
        helloWorld(request, response);
      }

      beforeEach( function() {
        requestSeen = false;
        webrequest.onBeforeSendHeaders.addListener(changeHeaders, { urls: ['http://*/*'] }, ['blocking', 'requestHeaders']);
      });

      afterEach( function() {
        webrequest.onBeforeSendHeaders.removeListener(changeHeaders);
      });

      it('modifies headers of the request', function() {
        testServer.registerPathHandler('/', collectHeaders);

        return browser.newTab(url).then(function () {
          return waitFor(function() {
            return requestSeen && headers !== null;
          }).then(function() {
            // newly added header
            console.log(headers);
            chai.expect(headers).to.have.property('newheader');
            chai.expect(headers['newheader']).to.equal('test');
            // removed header
            chai.expect(headers).to.not.have.property('accept-language');
            // modified header
            chai.expect(headers['user-agent']).to.equal('Cliqz');
          });
        });
      });

    });

  });
}
