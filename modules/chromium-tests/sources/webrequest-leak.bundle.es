/* global testServer */

import { newTab, updateTab } from '../platform/browser';
import WebRequest from '../platform/webrequest';


describe('WebRequest Leak Test', function () {
  let onBeforeRequest = [];
  let onBeforeSendHeaders = [];
  let onHeadersReceived = [];
  let hitCtr = 0;

  function onBeforeRequestCtr(req) {
    onBeforeRequest.push(req);
  }
  function onBeforeHeadersCtr(req) {
    onBeforeSendHeaders.push(req);
  }
  function onHeadersReceiveCtr(req) {
    onHeadersReceived.push(req);
  }

  beforeEach(function () {
    onBeforeRequest = [];
    onBeforeSendHeaders = [];
    onHeadersReceived = [];
    hitCtr = 0;
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

  it('does not leak requests across pages', (done) => {
    const page1 = testServer.getBaseUrl('static/leaktest.html');
    const page2 = testServer.getBaseUrl('static/thirdpartyscript.html');

    newTab(page1).then((tabId) => {
      setTimeout(() => {
        updateTab(tabId, page2).then(() => {
          setTimeout(() => {
            for (const ind in onBeforeRequest) {
              const req = onBeforeRequest[ind];
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
        });
      }, 500);
    });
  });

  it('does not leak iframe request across pages', function(done) {
    var baseUrl = 'http://localhost:3000';
    var page1 = baseUrl + '/leaktestiframe.html';
    var page2 = baseUrl + '/thirdpartyscript.html';
    var iframe = baseUrl + '/leaktest.html';

    newTab(page1).then((tabId) => {
      setTimeout(function() {
        updateTab(tabId, page2).then(() => {
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
        })
      }, 500);
    });
  })
});
