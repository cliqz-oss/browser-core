/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

/* global testServer */
/* global waitFor */
/* global chai */

import { newTab, updateTab } from '../platform/browser';
import WebRequest from '../platform/webrequest';


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

  function setupTabs(page1, page2) {
    return newTab(page1)
      .then(tab =>
        waitFor(() => onBeforeRequest.some(req => req.url.endsWith('leaktest.html')))
          .then(() => updateTab(tab, page2))
      )
      .then(() =>
        waitFor(() => onBeforeRequest.some(req => req.url.endsWith('2E85855CF4C75134')))
      );
  }

  beforeEach(function () {
    onBeforeRequest = [];
    onBeforeSendHeaders = [];
    onHeadersReceived = [];
    WebRequest.onBeforeRequest.addListener(onBeforeRequestCtr, { urls: ['*://*/*'] });
    WebRequest.onBeforeSendHeaders.addListener(onBeforeHeadersCtr, { urls: ['*://*/*'] });
    WebRequest.onHeadersReceived.addListener(onHeadersReceiveCtr, { urls: ['*://*/*'] });

    // TODO - hitCtr is the number of hits on /test
    // hitCtr += 1;
    return testServer.registerDirectory('/static', ['modules/firefox-tests/dist/mockserver'])
      .then(() => testServer.registerPathHandler('/test', '{}', [
        { name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { name: 'Pragma', value: 'no-cache' },
        { name: 'Expires', value: '0' },
      ]));
  });

  afterEach(function () {
    WebRequest.onBeforeRequest.removeListener(onBeforeRequestCtr);
    WebRequest.onBeforeSendHeaders.removeListener(onBeforeHeadersCtr);
    WebRequest.onHeadersReceived.removeListener(onHeadersReceiveCtr);
  });

  it('does not leak requests across pages', function () {
    const page1 = testServer.getBaseUrl('static/leaktest.html');
    const page2 = testServer.getBaseUrl('static/thirdpartyscript.html');

    return setupTabs(page1, page2).then(() => {
      onBeforeRequest.forEach((req) => {
        if (req.url.endsWith('test')) { // this is the onunload request in page1
          chai.expect(req.originUrl).to.equal(page1);
          chai.expect(req.source).to.equal(page1);
        } else if (req.url.endsWith('2E85855CF4C75134')) { // this is a request from page2
          chai.expect(req.originUrl).to.equal(page2);
          chai.expect(req.source).to.equal(page2);
        }
      });
    });
  });

  it('does not leak iframe request across pages', function () {
    const baseUrl = 'http://localhost:3000';
    const page1 = `${baseUrl}/leaktestiframe.html`;
    const page2 = `${baseUrl}/thirdpartyscript.html`;
    const iframe = `${baseUrl}/leaktest.html`;

    return setupTabs(page1, page2).then(() => {
      onBeforeRequest.forEach((req) => {
        if (req.url.endsWith('test')) { // this is the onunload request in page1
          chai.expect(req.originUrl).to.equal(iframe);
          // TODO: get this to properly resolve previous page
          chai.expect(req.source).to.equal(iframe);
        } else if (req.url.endsWith('2E85855CF4C75134')) { // this is a request from page2
          chai.expect(req.originUrl).to.equal(page2);
          chai.expect(req.source).to.equal(page2);
        }
      });
    });
  });
});
