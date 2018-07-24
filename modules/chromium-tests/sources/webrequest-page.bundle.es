/* eslint prefer-arrow-callback: 'off' */
/* eslint func-names: 'off' */
/* eslint no-unused-expressions: 'off' */
/* eslint no-param-reassign: 'off' */

import WebRequest from '../platform/webrequest';
import console from '../core/console';
import {
  chai,
  expect,
  newTab,
  testServer,
  waitFor
} from '../tests/core/test-helpers';


describe('WebRequest example pages', function () {
  const wrCollector = {
    topics: ['onBeforeRequest', 'onBeforeSendHeaders', 'onHeadersReceived'],
    setUp() {
      const collector = this;
      this.topics.forEach((t) => {
        collector[t] = [];
        collector[`${t}Ctr`] = function (req) {
          collector[t].push(req);
        };
        WebRequest[t].addListener(collector[`${t}Ctr`], { urls: ['*://*/*'] });
      });
    },
    tearDown() {
      for (const t of this.topics) {
        WebRequest[t].removeListener(this[`${t}Ctr`]);
      }
    }
  };
  let reqsReceived = [];

  const collectRequestParameters = function (request, response) {
    const rObj = {
      method: request.method,
      host: request.host,
      path: request.path,
      qs: request.queryString
    };
    const headerIter = request.headers;
    const headers = {};

    while (headerIter.hasMoreElements()) {
      const headerName = headerIter.getNext().toString();
      headers[headerName] = request.getHeader(headerName);
    }
    rObj.headers = headers;

    response.setHeader('Set-Cookie', `uid=abcdefghijklmnop; Domain=${rObj.host}; Path=/`);
    if (rObj.host !== 'localhost') {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // log request
    console.log(rObj);
    reqsReceived.push(rObj);

    // prevent caching
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');

    // send an appropriate response
    if (request.path.indexOf('.gif') > 0) {
      const imgFile = ['firefox-tests', 'mockserver', 'Transparent.gif'];
      console.log('send image');
      // send actual gif file
      testServer.writeFileResponse(request, imgFile, response);
    } else {
      response.setHeader('Content-Type', 'application/json');
      response.write('{}');
    }
  };

  function setupAttrackTestServer() {
    // Add static resources from cliqz@cliqz.com/firefox-tests/mockserver directory
    testServer.registerDirectory('/static', ['modules/firefox-tests/dist/mockserver']);
    testServer.registerDirectory('/node_modules/', ['node_modules']);
    // add specific handler for /test which will collect request parameters for testing.
    testServer.registerPathHandler('/test', collectRequestParameters);
    testServer.registerPathHandler('/test.gif', collectRequestParameters);

    const redirect302 = function (request, response) {
      console.log(request.path);
      response.setStatusLine('1.1', 302);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      const path = request.path.indexOf('.gif') > 0 ? 'test.gif' : 'test';
      response.setHeader('Location', `http://cliqztest.de:${testServer.port}/${path}?${request.queryString}`);
    };
    testServer.registerPathHandler('/tracker302', redirect302);
    testServer.registerPathHandler('/tracker302.gif', redirect302);
  }

  function isTestServerAddress(u) {
    return u.indexOf('favicon.ico') === -1 && ['localhost', '127.0.0.1', 'cliqztest.de'].some(function (d) {
      return u.startsWith(`http://${d}:${testServer.port}`);
    });
  }

  beforeEach(function () {
    wrCollector.setUp();
    setupAttrackTestServer();
    reqsReceived = [];
  });

  afterEach(function () {
    wrCollector.tearDown();
  });

  function testMainDocument(r, topic, md) {
    expect(r.tabId > 0);
    if (topic === 'onBeforeRequest') {
      // expect this to be the first request
      expect(md.tabId).to.be.undefined;
      md.tabId = r.tabId;
    }
    expect(r.tabId).to.equal(md.tabId);
    expect(r.parentFrameId).to.equal(r.tabId);
    expect(r.frameId).to.equal(r.tabId);
    expect(r.type).to.equal(6);
    expect(r.method).to.equal('GET');
    expect(r.isPrivate).to.be.false;
    expect(r.originUrl).to.equal(md.url);
  }

  function testInMainFrame(r, topic, md, type) {
    expect(r.tabId).to.equal(md.tabId);
    expect(r.parentFrameId).to.equal(r.tabId);
    expect(r.frameId).to.equal(r.tabId);
    expect(r.type).to.equal(type);
    expect(r.method).to.equal('GET');
    expect(r.isPrivate).to.be.false;
    expect(r.originUrl).to.equal(md.url);
  }

  function testIFrameDocument(r, topic, md) {
    expect(r.tabId > 0);
    if (topic === 'onBeforeRequest') {
      // expect this to be the first request
      expect(md.iframeid).to.be.undefined;
      md.iframeid = r.frameId;
    }
    expect(r.tabId).to.equal(md.tabId);
    expect(r.parentFrameId).to.equal(r.tabId);
    expect(r.frameId).to.equal(md.iframeid);
    expect(r.type).to.equal(7);
    expect(r.method).to.equal('GET');
    expect(r.isPrivate).to.be.false;
    expect(r.originUrl).to.equal(md.url);
    expect(r.source).to.equal(md.url);
  }

  function testInIFrame(r, topic, md, type) {
    expect(r.tabId).to.equal(md.tabId);
    expect(r.parentFrameId).to.equal(r.tabId);
    expect(r.frameId).to.equal(md.iframeid);
    expect(r.type).to.equal(type);
    expect(r.method).to.equal('GET');
    expect(r.isPrivate).to.be.false;
    // source refers to top level url, origin is the iframe url
    expect(r.originUrl).to.not.equal(md.url);
    expect(r.source).to.equal(md.url);
  }

  function testResponseCode(r, topic, code) {
    code = code || 200;
    if (topic === 'onHeadersReceived') {
      expect(r.responseStatus).to.equal(code);
    } else {
      expect(r.responseStatus).to.be.undefined;
    }
  }

  const pageTests = {
    'thirdpartyscript.html': {
      'http://localhost:60508/thirdpartyscript.html': function (r, topic, md) {
        testMainDocument(r, topic, md);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 11);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 2);
        testResponseCode(r, topic);
      }
    },

    'injectedscript.html': {
      'http://localhost:60508/injectedscript.html': function (r, topic, md) {
        testMainDocument(r, topic, md);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 11);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 2);
        testResponseCode(r, topic);
      }
    },

    'imgtest.html': {
      'http://localhost:60508/imgtest.html': function (r, topic, md) {
        testMainDocument(r, topic, md);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 3);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 3);
        testResponseCode(r, topic);
      }
    },

    'crossdomainxhr.html': {
      'http://localhost:60508/crossdomainxhr.html': function (r, topic, md) {
        testMainDocument(r, topic, md);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 11);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 11);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/node_modules/jquery/dist/jquery.js': function (r, topic, md) {
        testInMainFrame(r, topic, md, 2);
        testResponseCode(r, topic);
      }
    },

    'iframetest.html': {
      'http://localhost:60508/iframetest.html': function (r, topic, md) {
        testMainDocument(r, topic, md);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 11);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/iframe.html': function (r, topic, md) {
        testIFrameDocument(r, topic, md);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInIFrame(r, topic, md, 11);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/node_modules/jquery/dist/jquery.js': function (r, topic, md) {
        testInMainFrame(r, topic, md, 2);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/node_modules/jquery/dist/jquery.js': function (r, topic, md) {
        testInIFrame(r, topic, md, 2);
        testResponseCode(r, topic);
      }
    },

    // 'image302test.html': {
    //   'http://localhost:60508/image302test.html': function (r, topic, md) {
    //     testMainDocument(r, topic, md);
    //     testResponseCode(r, topic);
    //   },
    //   'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
    //     testInMainFrame(r, topic, md, 3);
    //     testResponseCode(r, topic);
    //   },
    //   'http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
    //     testInMainFrame(r, topic, md, 3);
    //     testResponseCode(r, topic, 302);
    //   },
    //   'http://cliqztest.de:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
    //     testInMainFrame(r, topic, md, 3);
    //     testResponseCode(r, topic);
    //   }
    // },

    'nestediframetest.html': {
      'http://localhost:60508/nestediframetest.html': function (r, topic, md) {
        testMainDocument(r, topic, md);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/node_modules/jquery/dist/jquery.js': function (r, topic, md) {
        testInMainFrame(r, topic, md, 2);
        testResponseCode(r, topic);
      },
      'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        testInMainFrame(r, topic, md, 11);
        testResponseCode(r, topic);
      },
      'http://cliqztest.de:60508/proxyiframe.html': function (r, topic, md) {
        testIFrameDocument(r, topic, md);
        testResponseCode(r, topic);
      },
      'http://cliqztest.de:60508/node_modules/jquery/dist/jquery.js': function (r, topic, md) {
        testInIFrame(r, topic, md, 2);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/iframe2.html': function (r, topic, md) {
        expect(r.tabId > 0);
        if (topic === 'onBeforeRequest') {
          // expect this to be the first request
          expect(md.iframeid2).to.be.undefined;
          md.iframeid2 = r.frameId;
        }
        expect(r.tabId).to.equal(md.tabId);
        expect(r.parentFrameId).to.equal(md.iframeid);
        expect(r.frameId).to.equal(md.iframeid2);
        expect(r.type).to.equal(7);
        expect(r.method).to.equal('GET');
        expect(r.isPrivate).to.be.false;
        expect(r.originUrl).to.equal('http://cliqztest.de:60508/proxyiframe.html');
        expect(r.source).to.equal(md.url);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/node_modules/jquery/dist/jquery.js': function (r, topic, md) {
        // tabId == top level tab; parentFrameId == outer iframe; frameId == this iframe
        expect(r.tabId).to.equal(md.tabId);
        expect(r.parentFrameId).to.equal(md.iframeid);
        expect(r.frameId).to.equal(md.iframeid2);
        expect(r.type).to.equal(2);
        expect(r.method).to.equal('GET');
        expect(r.isPrivate).to.be.false;
        expect(r.originUrl).to.equal('http://127.0.0.1:60508/iframe2.html');
        expect(r.source).to.equal(md.url);
        testResponseCode(r, topic);
      },
      'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
        expect(r.tabId).to.equal(md.tabId);
        expect(r.parentFrameId).to.equal(md.iframeid);
        expect(r.frameId).to.equal(md.iframeid2);
        expect(r.type).to.equal(11);
        expect(r.method).to.equal('GET');
        expect(r.isPrivate).to.be.false;
        expect(r.originUrl).to.equal('http://127.0.0.1:60508/iframe2.html');
        expect(r.source).to.equal(md.url);
        testResponseCode(r, topic);
      }
    }
  };

  const uid = '04C2EAD03BAB7F5E-2E85855CF4C75134';
  let block = false;
  function urlRewriter(req) {
    if (req.url.indexOf('localhost') === -1 && req.url.indexOf(uid) > -1) {
      if (block) {
        return { cancel: true };
      }
      return {
        redirectUrl: req.url.replace(uid, '')
      };
    }
    return {};
  }

  Object.keys(pageTests).forEach(function (testPage) {
    context(testPage, function () {
      const url = testServer.getBaseUrl(testPage);
      const expectedUrls = pageTests[testPage];

      it('determines correct request metadata', function () {
        return newTab(url).then(() =>
          waitFor(function () {
            const testReqs = wrCollector.onHeadersReceived
              .filter(req => isTestServerAddress(req.url));
            return testReqs.length >= Object.keys(expectedUrls).length;
          }).then(function () {
            const testState = {
              testPage,
              url
            };
            for (const topic of wrCollector.topics) {
              const reqs = wrCollector[topic]
                .filter(function (req) { return isTestServerAddress(req.url); })
                .reduce(function (hash, r) {
                  hash[r.url] = r;
                  return hash;
                }, Object.create(null));
              for (const seenUrl of Object.keys(expectedUrls)) {
                expect(reqs).to.have.property(seenUrl);
                expectedUrls[seenUrl](reqs[seenUrl], topic, testState);
              }
            }
          })
        );
      });

      function testRewrite(skipLengthTest) {
        block = false;
        reqsReceived = [];
        return newTab(url).then(() =>
          waitFor(function () {
            return reqsReceived.length >= 2;
          }).then(function () {
            if (!skipLengthTest) {
              expect(reqsReceived).to.have.length(2);
            }
            for (const req of reqsReceived) {
              // EXCEPTION: onBeforeRequest missed for image redirect
              if (req.host === 'localhost') {
                expect(req.qs).to.contain(uid);
              } else {
                expect(req.qs).to.not.contain(uid);
              }
            }
          })
        );
      }

      function testBlock() {
        block = true;
        reqsReceived = [];
        newTab(url).then(() =>
          waitFor(function () {
            return reqsReceived.length >= 1;
          }).then(function () {
            expect(reqsReceived).to.have.length(1);
            for (const req of reqsReceived) {
              // EXCEPTION: onBeforeRequest missed for image redirect
              if (req.host === 'localhost') {
                expect(req.qs).to.contain(uid);
              } else {
                chai.assert(false);
              }
            }
          })
        );
      }


      context('onBeforeRequest', function () {
        beforeEach(function () {
          WebRequest.onBeforeRequest.addListener(urlRewriter, { urls: ['*://*/*'] }, ['blocking']);
        });

        afterEach(function () {
          WebRequest.onBeforeRequest.removeListener(urlRewriter);
        });

        // special case: a 302 redirect does not trigger onBeforeRequest for the redirect target
        if (testPage !== 'image302test.html') {
          // when redirecting scripts specfied in the DOM in onBeforeRequest
          // we get a duplicate request
          it('can rewrite urls', function () {
            return testRewrite(testPage === 'thirdpartyscript.html');
          });

          it('can block urls', function () {
            return testBlock();
          });
        }
      });

      context('onBeforeSendHeaders', function () {
        beforeEach(function () {
          WebRequest.onBeforeSendHeaders.addListener(urlRewriter, { urls: ['*://*/*'] }, ['blocking']);
        });

        afterEach(function () {
          WebRequest.onBeforeSendHeaders.removeListener(urlRewriter);
        });

        it('can rewrite urls', function () {
          return testRewrite(testPage === 'thirdpartyscript.html');
        });

        it('can block urls', function () {
          return testBlock();
        });
      });
    });
  });
});
