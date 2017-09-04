/* global testServer */
/* global chai */
/* global waitFor */

import WebRequest from '../platform/webrequest';
import { utils } from '../core/cliqz';
import { newTab, closeTab } from '../platform/browser';


const helloWorld = '<html><body><p>Hello world</p></body></html';


describe('WebRequest', function () {
  let onBeforeRequest = [];
  let onBeforeSendHeaders = [];
  let onHeadersReceived = [];

  function onBeforeRequestCtr(req) {
    onBeforeRequest.push(req);
  }
  function onBeforeHeadersCtr(req) {
    onBeforeSendHeaders.push(req);
  }
  function onHeadersReceiveCtr(req) {
    onHeadersReceived.push(req);
  }

  beforeEach(() => {
    onBeforeRequest = [];
    onBeforeSendHeaders = [];
    onHeadersReceived = [];
    WebRequest.onBeforeRequest.addListener(onBeforeRequestCtr, { urls: ['*://*/*'] });
    WebRequest.onBeforeSendHeaders.addListener(onBeforeHeadersCtr, { urls: ['*://*/*'] });
    WebRequest.onHeadersReceived.addListener(onHeadersReceiveCtr, { urls: ['*://*/*'] });
  });

  afterEach(() => {
    // Reset listeners
    WebRequest.onBeforeRequest.removeListener(onBeforeRequestCtr);
    WebRequest.onBeforeSendHeaders.removeListener(onBeforeHeadersCtr);
    WebRequest.onHeadersReceived.removeListener(onHeadersReceiveCtr);
    onBeforeRequest = [];
    onBeforeSendHeaders = [];
    onHeadersReceived = [];
  });

  describe('Import should succeed', function () {
    it('Webrequest should be imported from platform', () => {
      chai.expect(WebRequest).to.not.be.undefined;
    });
  });

  context('http GET request', function () {
    const url = testServer.getBaseUrl();

    beforeEach(function (done) {
      testServer.registerPathHandler('/', helloWorld)
        .then(() => utils.httpGet(url, () => { done(); }, done));
    });

    it('calls each topic once', () => {
      for (const topic of [onBeforeRequest, onBeforeSendHeaders, onHeadersReceived]) {
        const reqs = topic.filter(req => req.url === url);
        chai.expect(reqs.length).to.eql(1);

        const req = reqs[0];
        chai.expect(req.method).to.equal('GET');

        // TODO - the tabId is not stable cross-platform
        // chai.expect(req.tabId).to.equal(-1);
        chai.expect(req.type).to.equal('xmlhttprequest');
      }
    });

    it('gives the response code only on headers received', function() {
      for (const topic of [onBeforeRequest, onBeforeSendHeaders]) {
        const reqs = topic.filter(req => req.url === url);
        const req = reqs[0];
        chai.expect(req.statusCode).to.be.undefined;
      }
      const req = onHeadersReceived.filter(r => r.url === url)[0];
      chai.expect(req.statusCode).to.equal(200);
    });

  });

  context('page loaded in tab', function () {
    const url = testServer.getBaseUrl();
    let tabId;

    beforeEach(function (done) {
      testServer.registerPathHandler('/', helloWorld)
        .then(() => {
          const tabLoaded = (r) => {
            if (r.url === url) {
              done();
              WebRequest.onHeadersReceived.removeListener(tabLoaded);
            }
          };
          WebRequest.onHeadersReceived.addListener(tabLoaded, { urls: ['*://*/*'] });
          return newTab(url).then((id) => { tabId = id; });
        });
    });

    afterEach(function() {
      return closeTab(tabId);
    });

    it('calls each topic once', function() {
      for (var topic of [onBeforeRequest, onBeforeSendHeaders, onHeadersReceived]) {
        var reqs = topic.filter( function(req) { return req.url === url });
        chai.expect(reqs.length).to.eql(1);

        var req = reqs[0];
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
    const url = testServer.getBaseUrl('block');
    var block = function(req) {
      if (req.url === url) {
        requestSeen = true;
        return {cancel: true};
      }
    };

    beforeEach( function() {
      WebRequest.onBeforeRequest.addListener(block, { urls: ['*://*/*'] }, ['blocking']);
    });

    afterEach( function() {
      WebRequest.onBeforeRequest.removeListener(block);
    });

    it('blocks the http request', function(done) {
      var serverHit = false;

      testServer.registerPathHandler('/block', helloWorld);
      requestSeen = false;
      newTab(url)
        .then(() => waitFor(() => requestSeen))
        .then(function() {
          testServer.getHits()
            .then((hits) => {
              // No hit on server
              chai.expect(hits).to.be.empty;

              // subsequent topics do not see request
              for (var topic of [onBeforeSendHeaders, onHeadersReceived]) {
                var reqs = topic.filter( function(req) { return req.url === url });
                chai.expect(reqs.length).to.eql(0);
              }
              done();
            });
        });
    });
  });

  context('listener returns redirectUrl', function () {
    let requestSeen = false;
    const baseUrl = testServer.getBaseUrl();
    const redirect = (req) => {
      if (req.url.indexOf(baseUrl) !== -1) {
        requestSeen = true;
        return { redirectUrl: testServer.getBaseUrl('redirect') };
      }

      return {};
    };

    beforeEach(() => {
      WebRequest.onBeforeRequest.addListener(redirect, { urls: ['*://*/*'] }, ['blocking']);
    });

    afterEach(() => {
      WebRequest.onBeforeRequest.removeListener(redirect);
    });

    it('redirects to specified url', (done) => {
      testServer.registerPathHandler('/', helloWorld);
      //  hitBase = true;
      testServer.registerPathHandler('/redirect', helloWorld);
      //  hitRedirect = true;

      requestSeen = false;
      newTab(testServer.getBaseUrl())
        .then(() => {
            waitFor(() => requestSeen).then(() => {
              testServer.getHits().then((hits) => {
                chai.expect(Object.keys(hits)).to.be.eql(['/redirect']);
                done();
              });
            });
        });
    });
  });

  context('listener returns requestHeaders', function () {
    let requestSeen = false;
    const url = testServer.getBaseUrl();

    const changeHeaders = (request) => {
      if (request.url === url) {
        requestSeen = true;
        return {
          requestHeaders: [
            { name: 'accept-encoding', value: 'gzip'},
            { name: 'newheader', value: 'test'},
          ]
        };
      }

      return {};
    };

    beforeEach((done) => {
      requestSeen = false;
      WebRequest.onBeforeSendHeaders.addListener(changeHeaders, { urls: [url] }, ['blocking', 'requestHeaders']);
      testServer.registerPathHandler('/', helloWorld)
        .then(() => utils.httpGet(url, () => { done(); }, done));
    });

    afterEach(() => {
      WebRequest.onBeforeSendHeaders.removeListener(changeHeaders);
    });

    it('modifies headers of the request', function (done) {
      waitFor(() => requestSeen)
        .then(() => testServer.getHits())
        .then((hits) => {
          const reqs = onBeforeSendHeaders.filter(req => req.url === url);
          const req = reqs[0];
          chai.expect(req.method).to.equal('GET');
          // Not
          // chai.expect(req.tabId).to.equal(-1);
          chai.expect(req.type).to.equal('xmlhttprequest');

          chai.expect(hits['/']).to.have.lengthOf(1);
          const headers = hits['/'][0].headers;

          // newly added header
          chai.expect(headers).to.have.property('newheader');
          chai.expect(headers['newheader']).to.equal('test');
          // modified header
          chai.expect(headers).to.have.property('accept-encoding');
          chai.expect(headers['accept-encoding']).to.equal('gzip');
          done();
        })
        .catch(done);
    });
  });
});
