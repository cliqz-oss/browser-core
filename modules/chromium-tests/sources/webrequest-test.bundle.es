/* eslint prefer-arrow-callback: 'off' */
/* eslint func-names: 'off' */
/* eslint no-unused-expressions: 'off' */


import WebRequest from '../platform/webrequest';
import { httpGet } from '../core/http';
import {
  closeTab,
  expect,
  newTab,
  testServer,
  waitFor
} from '../tests/core/test-helpers';


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
      expect(WebRequest).to.not.be.undefined;
    });
  });

  context('http GET request', function () {
    const url = `${testServer.getBaseUrl()}/`;

    beforeEach(function (done) {
      testServer.registerPathHandler('/', helloWorld)
        .then(() => httpGet(url, () => { done(); }, done, 30 * 1000));
    });

    it('calls each topic once', () => {
      for (const topic of [onBeforeRequest, onBeforeSendHeaders, onHeadersReceived]) {
        const reqs = topic.filter(req => req.url === url);
        expect(reqs.length).to.eql(1);

        const req = reqs[0];
        expect(req.method).to.equal('GET');

        // TODO - the tabId is not stable cross-platform
        // expect(req.tabId).to.equal(-1);
        expect(req.type).to.equal('xmlhttprequest');
      }
    });

    it('gives the response code only on headers received', function () {
      for (const topic of [onBeforeRequest, onBeforeSendHeaders]) {
        const reqs = topic.filter(req => req.url === url);
        const req = reqs[0];
        expect(req.statusCode).to.be.undefined;
      }
      const req = onHeadersReceived.filter(r => r.url === url)[0];
      expect(req.statusCode).to.equal(200);
    });
  });

  context('page loaded in tab', function () {
    const url = `${testServer.getBaseUrl()}/`;
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
        expect(reqs.length).to.eql(1);

        const req = reqs[0];
        expect(req.method).to.equal('GET');
        expect(req.type).to.equal('main_frame');
      }
    });

    it('gives the response code only on headers received', function () {
      for (const topic of [onBeforeRequest, onBeforeSendHeaders]) {
        const reqs = topic.filter(function (req) { return req.url === url; });
        const req = reqs[0];
        expect(req.statusCode).to.be.undefined;
      }
      const req = onHeadersReceived.filter(function (_req) { return _req.url === url; })[0];
      expect(req.statusCode).to.equal(200);
    });

    it('all listeners get same tabId', function () {
      let req = onBeforeRequest.filter(function (_req) { return _req.url === url; })[0];
      tabId = req.tabId;

      for (const topic of [onBeforeSendHeaders, onHeadersReceived]) {
        const reqs = topic.filter(function (_req) { return _req.url === url; });
        req = reqs[0];
        expect(req.tabId).to.equal(tabId);
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

    it('blocks the http request', async () => {
      requestSeen = false;
      await testServer.registerPathHandler('/block', helloWorld);
      await newTab(url);
      await waitFor(() => requestSeen);
      const hits = await testServer.getHits();
      // No hit on server
      expect(hits).to.be.empty;

      // subsequent topics do not see request
      for (const topic of [onBeforeSendHeaders, onHeadersReceived]) {
        const reqs = topic.filter(function (req) { return req.url === url; });
        expect(reqs.length).to.eql(0);
      }
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

    it('redirects to specified url', async () => {
      requestSeen = false;
      redirectSeen = false;

      await Promise.all([
        testServer.registerPathHandler('/', helloWorld),
        testServer.registerPathHandler('/redirect', helloWorld),
      ]);

      await newTab(testServer.getBaseUrl());
      await waitFor(() => requestSeen && redirectSeen);
      const hits = await testServer.getHits();
      expect([...hits.keys()]).to.be.eql(['/redirect']);
    });
  });

  context('listener returns requestHeaders', function () {
    let requestSeen = false;
    const url = `${testServer.getBaseUrl()}/`;

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
        .then(() => httpGet(url, () => { done(); }, done, 30 * 1000));
    });

    afterEach(() => {
      WebRequest.onBeforeSendHeaders.removeListener(changeHeaders);
    });

    it('modifies headers of the request', async () => {
      await waitFor(() => requestSeen);
      const hits = await testServer.getHits();
      const reqs = onBeforeSendHeaders.filter(req => req.url === url);
      const req = reqs[0];
      expect(req.method).to.equal('GET');
      // Not
      // expect(req.tabId).to.equal(-1);
      expect(req.type).to.equal('xmlhttprequest');

      expect(hits.get('/')).to.have.lengthOf(1);
      const headers = hits.get('/')[0].headers;

      // newly added header
      expect(headers).to.have.property('newheader');
      expect(headers.newheader).to.equal('test');
      // modified header
      expect(headers).to.have.property('accept-encoding');
      expect(headers['accept-encoding']).to.equal('gzip');
    });
  });
});
