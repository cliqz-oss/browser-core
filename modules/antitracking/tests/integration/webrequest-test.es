import {
  expect,
  newTab,
  testServer,
  waitFor,
} from '../../../tests/core/test-helpers';

import WebRequest from '../../../core/webrequest';


export default function () {
  const helloWorld = '<html><body><p>Hello world</p></body></html';

  describe('WebRequest Tests', function () {
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

    context('page loaded in tab', function () {
      const url = `${testServer.getBaseUrl('/', 'cliqztest.com')}/`;

      beforeEach(function (done) {
        testServer.registerPathHandler('/', { result: helloWorld })
          .then(() => {
            const tabLoaded = (r) => {
              if (r.url === url) {
                done();
                WebRequest.onHeadersReceived.removeListener(tabLoaded);
              }
            };
            WebRequest.onHeadersReceived.addListener(tabLoaded, { urls: ['*://*/*'] });
            return newTab(url);
          });
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
        const tabId = req.tabId;

        for (const topic of [onBeforeSendHeaders, onHeadersReceived]) {
          const reqs = topic.filter(function (_req) { return _req.url === url; });
          req = reqs[0];
          expect(req.tabId).to.equal(tabId);
        }
      });
    });

    context('listener returns cancel', function () {
      let requestSeen = false;
      const url = testServer.getBaseUrl('block', 'cliqztest.com');
      const block = function (req) {
        if (req.url === url) {
          requestSeen = true;
          return { cancel: true };
        }
        return undefined;
      };

      beforeEach(async function () {
        WebRequest.onBeforeRequest.addListener(block, { urls: ['*://*/*'] }, ['blocking']);
        await testServer.registerPathHandler('/block', { result: helloWorld });
        await newTab(url, false);
      });

      afterEach(function () {
        WebRequest.onBeforeRequest.removeListener(block);
      });

      it('blocks the http request', async () => {
        await waitFor(() => requestSeen);

        // No hit on server
        expect(await testServer.hasHit('/block')).to.be.false;

        // subsequent topics do not see request
        [onBeforeSendHeaders, onHeadersReceived].forEach((topic) => {
          const reqs = topic.filter(function (req) { return req.url === url; });
          expect(reqs.length).to.eql(0);
        });
      });
    });

    context('listener returns redirectUrl', function () {
      const baseUrl = testServer.getBaseUrl('/', 'cliqztest.com');
      const redirectUrl = testServer.getBaseUrl('/redirect', 'cliqztest.com');

      const redirect = (req) => {
        if (req.url.indexOf(baseUrl) !== -1 && req.url.indexOf('redirect') === -1) {
          return { redirectUrl };
        }

        return {};
      };

      beforeEach(async () => {
        WebRequest.onBeforeRequest.addListener(redirect, { urls: ['*://*/*'] }, ['blocking']);
        await Promise.all([
          testServer.registerPathHandler('/redirect', { result: helloWorld }),
          testServer.registerPathHandler('/', { result: helloWorld }),
        ]);
      });

      afterEach(() => {
        WebRequest.onBeforeRequest.removeListener(redirect);
      });

      it('redirects to specified url', async () => {
        await newTab(baseUrl);
        await waitFor(() => testServer.hasHit('/redirect'));
        const hits = await testServer.getHits();
        expect([...hits.keys()]).to.be.eql(['/redirect']);
      });
    });

    context('listener returns requestHeaders', function () {
      let requestSeen = false;
      const url = `${testServer.getBaseUrl('/', 'cliqztest.com')}/`;

      const changeHeaders = (request) => {
        if (request.url === url && !requestSeen) {
          requestSeen = true;
          const newHeaders = [...request.requestHeaders];

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

        return {};
      };

      beforeEach(() => {
        requestSeen = false;
        WebRequest.onBeforeSendHeaders.addListener(changeHeaders, { urls: [url] }, ['blocking', 'requestHeaders']);
        return testServer.registerPathHandler('/', { result: helloWorld });
      });

      afterEach(() => {
        WebRequest.onBeforeSendHeaders.removeListener(changeHeaders);
      });

      it('modifies headers of the request', async () => {
        await newTab(url);
        await waitFor(() => requestSeen);
        const hits = await testServer.getHits();
        const reqs = onBeforeSendHeaders.filter(req => req.url === url);
        const req = reqs[0];
        expect(req.method).to.equal('GET');
        // Not
        // expect(req.tabId).to.equal(-1);
        expect(req.type).to.equal('main_frame');

        expect(hits.get('/')).to.have.lengthOf(1);
        const headers = hits.get('/')[0].headers;

        // newly added header
        expect(headers).to.have.property('newheader');
        expect(headers.newheader).to.equal('test');
        // modified header
        expect(headers).to.have.property('user-agent');
        expect(headers['user-agent']).to.equal('Cliqz');
      });
    });
  });
}
