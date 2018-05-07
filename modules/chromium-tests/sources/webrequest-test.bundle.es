/* eslint prefer-arrow-callback: 'off' */
/* eslint func-names: 'off' */
/* eslint no-unused-expressions: 'off' */

/* global testServer */
/* global chai */
/* global waitFor */

import WebRequest from '../platform/webrequest';
import utils from '../core/utils';
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
        .then(() => utils.httpGet(url, () => { done(); }, done, 30 * 1000));
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

    it('gives the response code only on headers received', function () {
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

    afterEach(function () {
      return closeTab(tabId);
    });

    it('calls each topic once', function () {
      for (const topic of [onBeforeRequest, onBeforeSendHeaders, onHeadersReceived]) {
        const reqs = topic.filter(function (req) { return req.url === url; });
        chai.expect(reqs.length).to.eql(1);

        const req = reqs[0];
        chai.expect(req.method).to.equal('GET');
        chai.expect(req.type).to.equal('main_frame');
      }
    });

    it('gives the response code only on headers received', function () {
      for (const topic of [onBeforeRequest, onBeforeSendHeaders]) {
        const reqs = topic.filter(function (req) { return req.url === url; });
        const req = reqs[0];
        chai.expect(req.statusCode).to.be.undefined;
      }
      const req = onHeadersReceived.filter(function (_req) { return _req.url === url; })[0];
      chai.expect(req.statusCode).to.equal(200);
    });

    it('all listeners get same tabId', function () {
      let req = onBeforeRequest.filter(function (_req) { return _req.url === url; })[0];
      tabId = req.tabId;

      for (const topic of [onBeforeSendHeaders, onHeadersReceived]) {
        const reqs = topic.filter(function (_req) { return _req.url === url; });
        req = reqs[0];
        chai.expect(req.tabId).to.equal(tabId);
      }
    });
  });

  context('listener returns cancel', function () {
    let requestSeen = false;
    const url = testServer.getBaseUrl('block');
    const block = function (req) {
      if (req.url === url) {
        requestSeen = true;
        return { cancel: true };
      }
      return undefined;
    };

    beforeEach(function () {
      WebRequest.onBeforeRequest.addListener(block, { urls: ['*://*/*'] }, ['blocking']);
    });

    afterEach(function () {
      WebRequest.onBeforeRequest.removeListener(block);
    });

    it('blocks the http request', function () {
      requestSeen = false;
      return testServer.registerPathHandler('/block', helloWorld)
        .then(() => newTab(url))
        .then(() => waitFor(() => requestSeen))
        .then(() => testServer.getHits())
        .then(function (hits) {
          // No hit on server
          chai.expect(hits).to.be.empty;

          // subsequent topics do not see request
          for (const topic of [onBeforeSendHeaders, onHeadersReceived]) {
            const reqs = topic.filter(function (req) { return req.url === url; });
            chai.expect(reqs.length).to.eql(0);
          }
        });
    });
  });

  context('listener returns redirectUrl', function () {
    let requestSeen = false;
    let redirectSeen = false;
    const baseUrl = testServer.getBaseUrl();
    const redirectUrl = testServer.getBaseUrl('redirect');
    const redirect = (req) => {
      if (req.url.indexOf(redirectUrl) !== -1) {
        redirectSeen = true;
      } else if (req.url.indexOf(baseUrl) !== -1) {
        requestSeen = true;
        return { redirectUrl };
      }

      return {};
    };

    beforeEach(() => {
      WebRequest.onBeforeRequest.addListener(redirect, { urls: ['*://*/*'] }, ['blocking']);
    });

    afterEach(() => {
      WebRequest.onBeforeRequest.removeListener(redirect);
    });

    it('redirects to specified url', () => {
      requestSeen = false;
      redirectSeen = false;

      return Promise.all([
        testServer.registerPathHandler('/', helloWorld),
        testServer.registerPathHandler('/redirect', helloWorld),
      ])
        .then(() => newTab(testServer.getBaseUrl()))
        .then(() => waitFor(() => requestSeen && redirectSeen))
        .then(() => testServer.getHits())
        .then(function (hits) {
          chai.expect(Object.keys(hits)).to.be.eql(['/redirect']);
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
            { name: 'accept-encoding', value: 'gzip' },
            { name: 'newheader', value: 'test' },
          ]
        };
      }

      return {};
    };

    beforeEach((done) => {
      requestSeen = false;
      WebRequest.onBeforeSendHeaders.addListener(changeHeaders, { urls: [url] }, ['blocking', 'requestHeaders']);
      testServer.registerPathHandler('/', helloWorld)
        .then(() => utils.httpGet(url, () => { done(); }, done, 30 * 1000));
    });

    afterEach(() => {
      WebRequest.onBeforeSendHeaders.removeListener(changeHeaders);
    });

    it('modifies headers of the request', function () {
      return waitFor(() => requestSeen)
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
          chai.expect(headers.newheader).to.equal('test');
          // modified header
          chai.expect(headers).to.have.property('accept-encoding');
          chai.expect(headers['accept-encoding']).to.equal('gzip');
        });
    });
  });
});
