/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
/* eslint no-param-reassign: off */

const R = require('ramda');

const State = {
  DISABLED: 'DISABLED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY'
};

const mocks = {};
const expect = chai.expect;

// Use a reserved IP address (TEST-NET-2) to be
// sure it never gets resolved by accident
// (https://stackoverflow.com/a/10456065/783510)
const SAFE_TEST_IP1 = '198.51.100.1';
const SAFE_FALLBACK_TEST_IP = '198.51.100.255';

function resetMocks() {
  // will be created in "scriptedRequests" (cannot be trivially mocked here,
  // as it has to ensure that webrequestAPI handlers are called).
  mocks.getRequest = null;

  // simplified model: keeps track of installed allHeaders, but makes the
  // assumption that only 'onHeadersReceived' (with spec='blocking') is used
  mocks._handlers = {
    onBeforeSendHeaders: [],
    onHeadersReceived: [],
    onCompleted: [],
  };
  mocks.WebrequestPipelineStub = {
    isReady: () => Promise.resolve(),
    action: (method, event, arg) =>
      Promise.resolve().then(() => {
        if (method === 'addPipelineStep') {
          expect(arg).to.have.all.keys('name', 'spec', 'fn');
          mocks._handlers[event].push(arg);
        } else if (method === 'removePipelineStep') {
          // here, "arg" is the name of the handler to be removed
          mocks._handlers[event] = mocks._handlers[event].filter(x => x.name !== arg);
        } else {
          throw new Error(`Unexpected communication with request-pipeline: ${method}, ${event}, ${arg}`);
        }
      })
  };
}

// Mocks the "getRequest" function and simulates calls
// to the registered "onHeadersReceived" handler.
//
// Expects a mapping from urls to a description of how
// the mocked "getRequest" should respond.
//
// Optionally, it allows to simulate other unrelated requests
// which will also call the "onHeadersReceived" handler.
// The code under test is expected to ignore these unrelated
// requests.
//
function scriptedRequests(scriptRequests, opts = {}) {
  const lookupHeader = function (allHeaders, name) {
    return allHeaders
      .filter(x => x.name.toLowerCase() === name.toLowerCase())
      .map(x => x.value)[0];
  };

  let uniqueId = 1;
  const mkFakeRequestContext = (url, requestInfo, { includeResponse, requestCompleted }) => {
    if (!requestInfo.requestId) {
      uniqueId += 1;
      requestInfo.requestId = uniqueId;
    }
    let context = {
      tabId: requestInfo.tabId || -1,
      url: requestInfo.overwrittenUrl || url,
      requestId: requestInfo.requestId,

      requestHeaders: requestInfo.requestHeaders || [],
      getRequestHeader: function (name) {
        return lookupHeader(this.requestHeaders, name);
      }
    };

    // Include additional information that comes from the server
    // and is not available before the request has been sent.
    if (includeResponse) {
      context = Object.assign(context, {
        statusCode: requestInfo.statusCode || 200,

        responseHeaders: requestInfo.responseHeaders || [],
        getResponseHeader: function (name) {
          return lookupHeader(this.responseHeaders, name);
        }
      });

      if (requestCompleted) {
        context.ip = requestInfo.ip || SAFE_FALLBACK_TEST_IP;
      }
    }

    return context;
  };
  const mkFakeResponse = function () {
    return {
      block() {
        this.cancel = true;
      },
      modifyHeader(name, value) {
        if (!this.requestHeaders) {
          this.requestHeaders = [];
        }
        this.requestHeaders.push({ name, value });
      }
    };
  };

  mocks.getRequest = (url) => {
    const requestInfo = scriptRequests[url];

    // Step 1: Simulate call to "onBeforeSendHeaders" listener
    if (requestInfo && mocks._handlers.onBeforeSendHeaders.length > 0) {
      // If more than one handler was registered, something went wrong.
      // So, ignore that case and assume that there is at most one handler.
      expect(mocks._handlers.onBeforeSendHeaders).to.have.lengthOf(1);
      const handler = mocks._handlers.onBeforeSendHeaders[0].fn;

      const response = mkFakeResponse();
      const fakeRequestContext = mkFakeRequestContext(
        url,
        requestInfo,
        { includeResponse: false }
      );

      // Simulate some other requests that have nothing to do with the current
      // doublefetch request. This requests should not be cancelled.
      const otherRequests = opts.simulateNonDoublefetchRequests || [];
      for (const otherUrl of otherRequests) {
        const otherResponse = mkFakeResponse();
        const proceed = handler(mkFakeRequestContext(
          otherUrl,
          scriptRequests[otherUrl],
          { includeResponse: false }
        ),
        otherResponse);

        const wasCancelled = proceed === false || !!otherResponse.cancel;
        if (wasCancelled && scriptRequests[otherUrl].onCancel) {
          scriptRequests[otherUrl].onCancel();
        } else if (scriptRequests[otherUrl].onHeadersSent) {
          scriptRequests[otherUrl].onHeadersSent(otherResponse.requestHeaders
                                                 || scriptRequests[otherUrl].requestHeaders);
        }
      }

      // now back to the actual doublefetch request
      const proceed = handler(fakeRequestContext, response);

      const wasCancelled = proceed === false || !!response.cancel;
      if (wasCancelled) {
        if (requestInfo.onCancel) {
          requestInfo.onCancel();
        }
        return Promise.reject(new Error(`${url} was aborted`));
      }
      if (requestInfo.onHeadersSent) {
        requestInfo.onHeadersSent(response.requestHeaders || requestInfo.requestHeaders);
      }
    }

    // Step 2: Simulate call to "onHeadersReceived" listener
    if (requestInfo && mocks._handlers.onHeadersReceived.length > 0) {
      // If more than one handler was registered, something went wrong.
      // So, ignore that case and assume that there is at most one handler.
      expect(mocks._handlers.onHeadersReceived).to.have.lengthOf(1);
      const handler = mocks._handlers.onHeadersReceived[0].fn;

      const response = mkFakeResponse();
      const fakeRequestContext = mkFakeRequestContext(
        url,
        requestInfo,
        {
          includeResponse: true,
          requestCompleted: false,
        }
      );

      // Simulate some other requests that have nothing to do with the current
      // doublefetch request. These requests should not be cancelled.
      const otherRequests = opts.simulateNonDoublefetchRequests || [];
      for (const otherUrl of otherRequests) {
        const otherResponse = mkFakeResponse();
        const proceed = handler(mkFakeRequestContext(
          otherUrl,
          scriptRequests[otherUrl],
          {
            includeResponse: true,
            requestCompleted: false,
          }
        ),
        otherResponse);

        const wasAborted = proceed === false || !!otherResponse.cancel;
        if (wasAborted && scriptRequests[otherUrl].onCancel) {
          scriptRequests[otherUrl].onCancel();
        }
      }

      // now back to the actual doublefetch request
      const proceed = handler(fakeRequestContext, response);

      const wasCancelled = proceed === false || !!response.cancel;
      if (wasCancelled) {
        if (requestInfo.onCancel) {
          requestInfo.onCancel();
        }
        return Promise.reject(new Error(`${url} was aborted`));
      }

      if (requestInfo.statusCode
          && requestInfo.statusCode >= 300 && requestInfo.statusCode < 400
          && requestInfo.responseHeaders) {
        for (const redirectTo of requestInfo.responseHeaders
          .filter(x => x.name.toLowerCase() === 'location')
          .map(x => x.value)) {
          scriptRequests[redirectTo].requestId = requestInfo.requestId;
          return mocks.getRequest(redirectTo);
        }
      }
    }

    // Step 3: Simulate call to "onCompleted" listener
    if (requestInfo && mocks._handlers.onCompleted.length > 0) {
      // If more than one handler was registered, something went wrong.
      // So, ignore that case and assume that there is at most one handler.
      expect(mocks._handlers.onCompleted).to.have.lengthOf(1);
      const onCompletedHandler = mocks._handlers.onCompleted[0].fn;
      let handler;
      if (!opts.runOnCompletedHandlersAfterTheRequestIsResolved) {
        // By default, fire onCompletedHandlers before the request resolves.
        // The advantage is that we will not miss errors thrown by the handler.
        //
        // Note that in the browser itself, the order in which "onCompleted"
        // is called, is not guaranteed. It can happen before or after the
        // request itself.
        handler = onCompletedHandler;
      } else {
        // Simulate a race condition: the handler will get triggered
        // after we already have resolved the request.
        handler = (...args) => {
          setTimeout(() => {
            onCompletedHandler(...args);
          }, 0);
        };
      }

      const response = mkFakeResponse();
      const fakeRequestContext = mkFakeRequestContext(
        url, requestInfo, { includeResponse: true, requestCompleted: true }
      );

      // Simulate some other requests that have nothing to do with the current
      // doublefetch request. These requests should not be cancelled.
      const otherRequests = opts.simulateNonDoublefetchRequests || [];
      for (const otherUrl of otherRequests) {
        const otherResponse = mkFakeResponse();
        const otherFakeContext = mkFakeRequestContext(
          otherUrl, scriptRequests[otherUrl], {
            includeResponse: true, requestCompleted: true
          }
        );
        handler(otherFakeContext, otherResponse);
      }

      // now back to the actual doublefetch request
      handler(fakeRequestContext, response);
    }

    return Promise.resolve(`dummy content of ${url}`);
  };
}

export default describeModule('human-web/doublefetch-handler',
  () => ({
    'platform/human-web/doublefetch': {
      default: {
        getRequest: (...args) => mocks.getRequest(...args)
      },
      getRequest: (...args) => mocks.getRequest(...args)
    },
    'core/url': {
      // TODO: would be nice to use the real implementation, but that
      // is not so easy. This is an oversimplified implementation, but
      // for testing purposes, it should be sufficient.
      equals: (url1, url__) => url1 === url__
    },
    'core/services/pacemaker': {
      default: {
        setTimeout() {
          return { stop() {} };
        },
        register() {
          return { stop() {} };
        },
        clearTimeout() { },
      },
    },
    'core/kord/inject': {
      ifModuleEnabled(promise) {
        return promise.catch(() => {
          // Ignore
        });
      },
      default: {
        module: (name) => {
          if (name === 'webrequest-pipeline') {
            return mocks.WebrequestPipelineStub;
          }
          throw new Error(`Stubbing error: ${name}`);
        }
      }
    },
    'platform/human-web/dns': {
      default: {}
    },
    'human-web/logger': {
      default: {
        debug() {},
        log() {},
        warn() {},
        error() {},
      }
    },
  }),
  () => {
    describe('#DoublefetchHandler', function () {
      let DoublefetchHandler;
      let onHostnameResolvedHook;
      let uut;

      beforeEach(function () {
        DoublefetchHandler = this.module().default;
        resetMocks();

        // default callback handler; can be overwritten
        // by test if they want to add their own checks
        onHostnameResolvedHook = (domain, ip) => {
          expect(domain).to.be.a('string').that.is.not.empty;
          expect(ip).to.be.a('string').that.is.not.empty;
        };

        uut = new DoublefetchHandler({
          onHostnameResolved: (...args) => {
            onHostnameResolvedHook(...args);
          }
        });
      });

      afterEach(function () {
        return uut.unload()
          .then(() => {
            // verify that all webRequest handlers have been removed
            expect(mocks._handlers).to.deep.equal({
              onBeforeSendHeaders: [],
              onHeadersReceived: [],
              onCompleted: [],
            });
          });
      });

      it('should initially be disabled', function () {
        expect(uut._state).to.equal(State.DISABLED);
      });

      it('should init and unload successfully', function () {
        return Promise.resolve()
          .then(() => { expect(uut._state).to.equal(State.DISABLED); })
          .then(() => uut.init())
          .then(() => { expect(uut._state).to.equal(State.READY); })
          .then(() => uut.unload())
          .then(() => { expect(uut._state).to.equal(State.DISABLED); })
          .then(() => uut.init())
          .then(() => { expect(uut._state).to.equal(State.READY); });
      });

      it('init/unload should be safe to call multiple times in a row', function () {
        return Promise.resolve()
          .then(() => uut.unload())
          .then(() => uut.unload())
          .then(() => uut.init())
          .then(() => uut.init())
          .then(() => uut.unload())
          .then(() => uut.unload())
          .then(() => uut.init())
          .then(() => { expect(uut._state).to.equal(State.READY); })
          .then(() => uut.unload())
          .then(() => { expect(uut._state).to.equal(State.DISABLED); });
      });

      it('should never end up in an inconsistent state', function () {
        const uncoordinatedStartStopAttempts = [
          uut.init(),
          uut.init(),
          uut.unload(),
          uut.init(),
          uut.unload()];

        // should still be able to recover from the mess above
        return Promise.all(uncoordinatedStartStopAttempts)
          .then(() => uut.init())
          .then(() => { expect(uut._state).to.equal(State.READY); })
          .then(() => uut.unload())
          .then(() => { expect(uut._state).to.equal(State.DISABLED); });
      });

      it('should reject requests when state is DISABLED', function () {
        expect(uut._state).to.equal(State.DISABLED);

        let sent = false;
        scriptedRequests({
          'http://dummy.test': { onHeadersSent: () => { sent = true; } }
        });

        let wasRejected = false;
        return uut.anonymousHttpGet('http://dummy.test')
          .catch(() => {
            wasRejected = true;
          }).then(() => {
            expect(wasRejected).to.be.true;
            expect(sent).to.be.false;
          });
      });

      it('should send requests when state is INITIALIZED', function () {
        let sent = false;
        scriptedRequests({
          'http://dummy.test': { onHeadersSent: () => { sent = true; } }
        });

        return uut.init()
          .then(() => uut.anonymousHttpGet('http://dummy.test'))
          .then(() => {
            expect(sent).to.be.true;
          });
      });

      it('should set "maxDoubleFetchSize"', function () {
        expect(uut.maxDoubleFetchSize).to.be.at.least(0);
      });

      it('should abort huge requests', function () {
        // scenario: 300MB request should be cancelled assuming our limit is 2MB
        let wasCancelled = false;
        scriptedRequests({
          'http://dummy.test': {
            responseHeaders: [{ name: 'Content-Length', value: '300000000' }],
            onCancel: () => { wasCancelled = true; }
          }
        });
        uut.maxDoubleFetchSize = 2 * 1024 * 1024;

        let doublefetchFailed = false;
        return uut.init()
          .then(() => uut.anonymousHttpGet('http://dummy.test'))
          .catch(() => { doublefetchFailed = true; })
          .then(() => {
            expect(wasCancelled).to.be.true;
            expect(doublefetchFailed).to.be.true;
          });
      });

      it('should allow small double fetch requests', function () {
        // scenario: 100K request should be allowed to complete assuming our limit is 2MB
        let wasCancelled = false;
        scriptedRequests({
          'http://dummy.test': {
            responseHeaders: [{ name: 'Content-Length', value: '100000' }],
            onCancel: () => { wasCancelled = true; }
          }
        });
        uut.maxDoubleFetchSize = 2 * 1024 * 1024;

        let doublefetchFailed = false;
        return uut.init()
          .then(() => uut.anonymousHttpGet('http://dummy.test'))
          .catch(() => { doublefetchFailed = true; })
          .then(() => {
            expect(wasCancelled).to.be.false;
            expect(doublefetchFailed).to.be.false;
          });
      });

      it('should should follow redirects, but block the following request if it is too big', function () {
        let cancelledBeforeRedirect = false;
        let cancelledAfterRedirect = false;
        scriptedRequests(
          {
            'https://goo.gl/xyz': {
              responseHeaders: [{ name: 'Location', value: 'http://dummy.test' }],
              statusCode: 301,
              onCancel: () => { cancelledBeforeRedirect = true; }
            },
            'http://dummy.test': {
              responseHeaders: [{ name: 'Content-Length', value: '1000000' }],
              onCancel: () => { cancelledAfterRedirect = true; }
            },
          }
        );
        uut.maxDoubleFetchSize = 10;

        let doublefetchFailed = false;
        return uut.init()
          .then(() => uut.anonymousHttpGet('http://dummy.test'))
          .catch(() => { doublefetchFailed = true; })
          .then(() => {
            expect(cancelledBeforeRedirect).to.be.false;
            expect(cancelledAfterRedirect).to.be.true;
            expect(doublefetchFailed).to.be.true;
          });
      });

      it('should should follow redirects and allow following request if it is small', function () {
        let cancelledBeforeRedirect = false;
        let cancelledAfterRedirect = false;
        scriptedRequests(
          {
            'https://goo.gl/xyz': {
              responseHeaders: [{ name: 'Location', value: 'http://dummy.test' }],
              statusCode: 301,
              onCancel: () => { cancelledBeforeRedirect = true; }
            },
            'http://dummy.test': {
              responseHeaders: [{ name: 'Content-Length', value: '1' }],
              onCancel: () => { cancelledAfterRedirect = true; }
            },
          }
        );
        uut.maxDoubleFetchSize = 10;

        let doublefetchFailed = false;
        return uut.init()
          .then(() => uut.anonymousHttpGet('http://dummy.test'))
          .catch(() => { doublefetchFailed = true; })
          .then(() => {
            expect(cancelledBeforeRedirect).to.be.false;
            expect(cancelledAfterRedirect).to.be.false;
            expect(doublefetchFailed).to.be.false;
          });
      });

      it('should never block non-doublefetch requests (scenario: doublefetch cancelled)', function () {
        let cancelledDoublefetchRequest = false;
        let cancelledWrongRequests = false;
        scriptedRequests(
          {
            'http://doublefetch.test': {
              responseHeaders: [{ name: 'Content-Length', value: '10000' }],
              onCancel: () => { cancelledDoublefetchRequest = true; }
            },
            'https://api.cliqz.test/foo': {
              responseHeaders: [{ name: 'Content-Length', value: '10000' }],
              onCancel: () => { cancelledWrongRequests = true; }
            },
            'https://api.cliqz.test/bar': {
              responseHeaders: [{ name: 'Content-Length', value: '10000' }],
              onCancel: () => { cancelledWrongRequests = true; }
            },
          },
          {
            simulateNonDoublefetchRequests: ['https://api.cliqz.test/foo', 'https://api.cliqz.test/bar']
          }
        );
        uut.maxDoubleFetchSize = 10;

        let doublefetchFailed = false;
        return uut.init()
          .then(() => uut.anonymousHttpGet('http://doublefetch.test'))
          .catch(() => { doublefetchFailed = true; })
          .then(() => {
            expect(doublefetchFailed).to.be.true;
            expect(cancelledDoublefetchRequest).to.be.true;
            expect(cancelledWrongRequests).to.be.false;
          });
      });

      it('should never block non-doublefetch requests (scenario: doublefetch passed)', function () {
        let cancelledDoublefetchRequest = false;
        let cancelledWrongRequests = false;
        scriptedRequests(
          {
            'http://doublefetch.test': {
              responseHeaders: [{ name: 'Content-Length', value: '1' }],
              onCancel: () => { cancelledDoublefetchRequest = true; }
            },
            'https://api.cliqz.test/foo': {
              responseHeaders: [{ name: 'Content-Length', value: '10000' }],
              onCancel: () => { cancelledWrongRequests = true; }
            },
            'https://api.cliqz.test/bar': {
              responseHeaders: [{ name: 'Content-Length', value: '10000' }],
              onCancel: () => { cancelledWrongRequests = true; }
            },
          },
          {
            simulateNonDoublefetchRequests: ['https://api.cliqz.test/foo', 'https://api.cliqz.test/bar']
          }
        );
        uut.maxDoubleFetchSize = 10;

        let doublefetchFailed = false;
        return uut.init()
          .then(() => uut.anonymousHttpGet('http://doublefetch.test'))
          .catch(() => { doublefetchFailed = true; })
          .then(() => {
            expect(doublefetchFailed).to.be.false;
            expect(cancelledDoublefetchRequest).to.be.false;
            expect(cancelledWrongRequests).to.be.false;
          });
      });

      it('should remove sensitive headers (e.g., "origin", "cookie", "X-*) in doublefetch requests', function () {
        let cancelledDoublefetchRequest = false;
        let cancelledWrongRequests = false;
        let sent1 = false;
        let sent2 = false;
        let sent3 = false;
        scriptedRequests(
          {
            'http://doublefetch.test/1': {
              requestHeaders: [
                { name: 'Content-Type', value: 'text/html' },
                { name: 'Cookie', value: 'Secret' },
                { name: 'Origin', value: 'moz-extension://123' },
                { name: 'X-DevTools-Emulate-Network-Conditions-Client-Id', value: '123' },
                { name: 'X-Client-Data', value: '123' },
              ],
              responseHeaders: [{ name: 'Location', value: 'http://doublefetch.test/2' }],
              statusCode: 301,

              onCancel: () => { cancelledDoublefetchRequest = true; },
              onHeadersSent: (headers) => {
                expect(sent1).to.be.false;
                sent1 = true;

                // Only the 'Content-Type' header should remain, while
                // the other headers should have been removed
                expect(headers).to.deep.equal([{ name: 'Content-Type', value: 'text/html' }]);
              }
            },
            'http://doublefetch.test/2': {
              requestHeaders: [
                { name: 'content-type', value: 'text/html' },
                { name: 'cookie', value: 'Secret' },
                { name: 'origin', value: 'moz-extension://123' },
                { name: 'x-devtools-emulate-network-conditions-client-id', value: '123' },
                { name: 'x-client-data', value: '123' },
              ],
              responseHeaders: [{ name: 'Location', value: 'http://doublefetch.test/3' }],
              statusCode: 301,

              onCancel: () => { cancelledWrongRequests = true; },
              onHeadersSent: (headers) => {
                expect(sent2).to.be.false;
                sent2 = true;

                // Same as above, only this time everything is in lower case.
                expect(headers).to.deep.equal([{ name: 'content-type', value: 'text/html' }]);
              }
            },
            'http://doublefetch.test/3': {
              requestHeaders: [
                { name: 'CONTENT-TYPE', value: 'text/html' },
                { name: 'COOKIE', value: 'Secret' },
                { name: 'ORIGIN', value: 'moz-extension://123' },
                { name: 'X-DEVTOOLS-EMULATE-NETWORK-CONDITIONS-CLIENT-ID', value: '123' },
                { name: 'X-CLIENT-DATA', value: '123' },
              ],
              onCancel: () => { cancelledWrongRequests = true; },
              onHeadersSent: (headers) => {
                expect(sent3).to.be.false;
                sent3 = true;

                // Same as above, only this time everything is in upper case.
                expect(headers).to.deep.equal([{ name: 'CONTENT-TYPE', value: 'text/html' }]);
              }
            }
          }
        );

        let doublefetchFailed = false;
        return uut.init()
          .then(() => uut.anonymousHttpGet('http://doublefetch.test/1'))
          .catch(() => { doublefetchFailed = true; })
          .then(() => {
            expect(doublefetchFailed).to.be.false;
            expect(cancelledDoublefetchRequest).to.be.false;
            expect(cancelledWrongRequests).to.be.false;
            // all three requests should have been sent
            expect(sent1).to.be.true;
            expect(sent2).to.be.true;
            expect(sent3).to.be.true;
          });
      });

      const shouldNotModifyNonSensitiveHeaders = () => {
        let sent = false;

        // Dump of an example request. All these headers should not be touched.
        const originalHeaders = [
          ['Host', 'example.com'],
          ['User-Agent', 'Mozilla/5.0 (X11; Linux x86_64; rv:57.0) Gecko/20100101 Firefox/57.0'],
          ['Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
          ['Accept-Language', 'en-US,en;q=0.5'],
          ['Accept-Encoding', 'gzip, deflate'],
          ['Connection', 'keep-alive'],
          ['Upgrade-Insecure-Requests', '1'],
          ['If-Modified-Since', 'Fri, 09 Aug 2013 23:54:35 GMT'],
          ['If-None-Match', '359670651+gzip'],
          ['Cache-Control', 'max-age=0'],
        ].map(x => ({ name: x[0], value: x[1] }));

        scriptedRequests({
          'http://doublefetch.test/': {
            requestHeaders: R.clone(originalHeaders),

            onHeadersSent: (headers) => {
              sent = true;

              // Verify that the headers have not been changed.
              // (We make no assumptions about the order, although
              // practically, there is little reason to make changes.)
              expect(headers).to.have.deep.members(originalHeaders);
            }
          }
        });

        let doublefetchFailed = false;
        return uut.init()
          .then(() => uut.anonymousHttpGet('http://doublefetch.test/'))
          .catch(() => { doublefetchFailed = true; })
          .then(() => {
            expect(doublefetchFailed).to.be.false;
            expect(sent).to.be.true;
          });
      };

      it('should not modify non-sensitive headers (real request)', function () {
        const originalHeaders = [
          ['Host', 'example.com'],
          ['User-Agent', 'Mozilla/5.0 (X11; Linux x86_64; rv:57.0) Gecko/20100101 Firefox/57.0'],
          ['Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
          ['Accept-Language', 'en-US,en;q=0.5'],
          ['Accept-Encoding', 'gzip, deflate'],
          ['Connection', 'keep-alive'],
          ['Upgrade-Insecure-Requests', '1'],
          ['If-Modified-Since', 'Fri, 09 Aug 2013 23:54:35 GMT'],
          ['If-None-Match', '359670651+gzip'],
          ['Cache-Control', 'max-age=0'],
        ];
        return shouldNotModifyNonSensitiveHeaders(originalHeaders);
      });

      it('should only strip X-* headers', function () {
        const originalHeaders = [
          ['x', '1'],
          ['xyz', '1'],
          ['xyz-', '1'],
          ['xyz-not-application-protocol', '1'],
          ['XYZ', '1'],
          ['xx-x-x', '1'],
        ];
        return shouldNotModifyNonSensitiveHeaders(originalHeaders);
      });

      describe('should call "onHostnameResolved" after successful doublefetch requests', function () {
        function runTest({ runHandlerAfterRequest }) {
          const onHostnameResolvedCalls = [];
          onHostnameResolvedHook = (hostname, ip) => {
            onHostnameResolvedCalls.push([hostname, ip]);
          };

          const resolvedIP = SAFE_TEST_IP1;
          scriptedRequests(
            {
              'http://doublefetch.test': {
                ip: resolvedIP
              },
              'https://api.cliqz.test/foo': {
              },
              'https://api.cliqz.test/bar': {
              },
            },
            {
              simulateNonDoublefetchRequests: ['https://api.cliqz.test/foo', 'https://api.cliqz.test/bar'],
              runOnCompletedHandlersAfterTheRequestIsResolved: runHandlerAfterRequest
            }
          );

          return uut.init()
            .then(() => uut.anonymousHttpGet('http://doublefetch.test'))
            .then(() => {
              expect(onHostnameResolvedCalls).to.eql([['doublefetch.test', resolvedIP]]);
            });
        }

        it('when onCompletedHandler is triggered after the request promise is resolved', function () {
          return runTest({ runHandlerAfterRequest: true });
        });

        it('when onCompletedHandler is triggered before the request promise is resolved', function () {
          return runTest({ runHandlerAfterRequest: false });
        });
      });
    });
  });
