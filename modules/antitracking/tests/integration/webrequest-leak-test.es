import {
  expect,
  newTab,
  testServer,
  updateTab,
  waitFor,
} from '../../../tests/core/integration/helpers';

import WebRequest from '../../../core/webrequest';


export default function () {
  describe('WebRequest Leak Test', function () {
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

    async function setupTabs(page1, page2) {
      const tab = await newTab(page1);
      await waitFor(() => onBeforeRequest.some(req => req.url.endsWith('leaktest.html')));
      await updateTab(tab, { url: page2 });
      await waitFor(() => onBeforeRequest.some(req => req.url.endsWith('2E85855CF4C75134')));
    }

    beforeEach(async () => {
      onBeforeRequest = [];
      onBeforeSendHeaders = [];
      onHeadersReceived = [];
      WebRequest.onBeforeRequest.addListener(onBeforeRequestCtr, { urls: ['*://*/*'] });
      WebRequest.onBeforeSendHeaders.addListener(onBeforeHeadersCtr, { urls: ['*://*/*'] });
      WebRequest.onHeadersReceived.addListener(onHeadersReceiveCtr, { urls: ['*://*/*'] });

      await Promise.all([
        testServer.registerDirectory('/', ['modules/antitracking/dist/mockserver']),
        testServer.registerPathHandler('/test', {
          headers: [
            { name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
            { name: 'Pragma', value: 'no-cache' },
            { name: 'Expires', value: '0' },
          ],
        }),
      ]);
    });

    afterEach(function () {
      WebRequest.onBeforeRequest.removeListener(onBeforeRequestCtr);
      WebRequest.onBeforeSendHeaders.removeListener(onBeforeHeadersCtr);
      WebRequest.onHeadersReceived.removeListener(onHeadersReceiveCtr);
    });

    it('does not leak requests across pages', async () => {
      const page1 = testServer.getBaseUrl('/leaktest.html');
      const page2 = testServer.getBaseUrl('/thirdpartyscript.html');

      await setupTabs(page1, page2);
      onBeforeRequest.forEach((req) => {
        if (req.url.endsWith('test')) { // this is the onunload request in page1
          if (req.originUrl !== undefined) {
            expect(req.originUrl).to.equal(page1);
          }
          if (req.sourceUrl !== undefined) {
            expect(req.sourceUrl).to.equal(page1);
          }
        } else if (req.url.endsWith('2E85855CF4C75134')) { // this is a request from page2
          if (req.originUrl !== undefined) {
            expect(req.originUrl).to.equal(page2);
          }
          if (req.sourceUrl !== undefined) {
            expect(req.sourceUrl).to.equal(page2);
          }
        }
      });
    });

    it('does not leak iframe request across pages', async () => {
      const page1 = testServer.getBaseUrl('/leaktestiframe.html');
      const page2 = testServer.getBaseUrl('/thirdpartyscript.html');
      const iframe = testServer.getBaseUrl('/leaktest.html');

      await setupTabs(page1, page2);
      onBeforeRequest.forEach((req) => {
        if (req.url.endsWith('test')) { // this is the onunload request in page1
          if (req.originUrl !== undefined) {
            expect(req.originUrl).to.equal(iframe);
          }
        } else if (req.url.endsWith('2E85855CF4C75134')) { // this is a request from page2
          if (req.originUrl !== undefined) {
            expect(req.originUrl).to.equal(page2);
          }
          if (req.sourceUrl !== undefined) {
            expect(req.sourceUrl).to.equal(page2);
          }
        }
      });
    });
  });
}
