/* eslint-disable no-param-reassign */

import {
  expect,
  newTab,
  sleep,
  testServer,
  waitFor,
} from '../../../tests/core/integration/helpers';

import WebRequest from '../../../core/webrequest';
import { isBootstrap } from '../../../core/platform';


export default function () {
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
        this.topics.forEach((t) => {
          WebRequest[t].removeListener(this[`${t}Ctr`]);
        });
      }
    };

    const collectRequestParameters = result => ({
      result,
      headers: [
        { name: 'Set-Cookie', value: 'uid=abcdefghijklmnop; Domain={req.hostname}; Path=/' },
        { name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { name: 'Pragma', value: 'no-cache' },
        { name: 'Expires', value: '0' },

        // TODO: check if needed
        // { name: 'Access-Control-Allow-Origin', value: '*' },
        // { name: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
    });

    async function setupAttrackTestServer() {
      const redirect302 = path => ({
        result: '{}',
        status: '302',
        headers: [
          { name: 'Access-Control-Allow-Origin', value: '*' },
          { name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { name: 'Pragma', value: 'no-cache' },
          { name: 'Expires', value: '0' },
          { name: 'Location', value: `http://cliqztest.de:${testServer.port}/${path}?{req.queryString}` },
        ],
      });

      await Promise.all([
        // add specific handler for /test which will collect request parameters for testing.
        testServer.registerPathHandler('/test.gif', collectRequestParameters('{Transparent.gif}')),
        testServer.registerPathHandler('/test', collectRequestParameters('{}')),
        testServer.registerPathHandler('/tracker302.gif', redirect302('test.gif')),
        testServer.registerPathHandler('/tracker302', redirect302('test')),
        // Add static resources used by tests
        testServer.registerDirectory('/', ['modules/antitracking/dist/mockserver']),
      ]);
    }

    function isTestServerAddress(u) {
      return u.indexOf('favicon.ico') === -1 && ['localhost', '127.0.0.1', 'cliqztest.de', 'cliqztest.com'].some(function (d) {
        return u.startsWith(`http://${d}:${testServer.port}`);
      });
    }

    beforeEach(async function () {
      wrCollector.setUp();
      await setupAttrackTestServer();
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
      expect(r.parentFrameId).to.equal(-1);
      expect(r.frameId).to.equal(0);
      expect(r.type).to.equal('main_frame');
      expect(r.method).to.equal('GET');
      if (isBootstrap) {
        expect(r.isPrivate).to.be.false;
        // expect(r.originUrl).to.equal(md.url);
      }
    }

    function testInMainFrame(r, topic, md, type) {
      expect(r.tabId).to.equal(md.tabId);
      if (type) {
        expect(r.type).to.equal(type);
      }
      expect(r.method).to.equal('GET');
      expect(r.parentFrameId).to.equal(-1);

      if (isBootstrap) {
        expect(r.isPrivate).to.be.false;
        expect(r.originUrl).to.equal(md.url);
      }
    }

    function testIFrameDocument(r, topic, md) {
      expect(r.tabId > 0);
      if (topic === 'onBeforeRequest') {
        // expect this to be the first request
        expect(md.iframeid).to.be.undefined;
        md.iframeid = r.frameId;
      }
      expect(r.tabId).to.equal(md.tabId);
      expect(r.parentFrameId).to.equal(0);
      expect(r.frameId).to.equal(md.iframeid);
      expect(r.type).to.equal('sub_frame');
      expect(r.method).to.equal('GET');

      if (isBootstrap) {
        expect(r.isPrivate).to.be.false;
        expect(r.originUrl).to.equal(md.url);
        // expect(r.sourceUrl).to.equal(md.url);
      }
    }

    function testInIFrame(r, topic, md, type) {
      expect(r.tabId).to.equal(md.tabId);
      expect(r.parentFrameId).to.equal(0);
      expect(r.frameId).to.equal(md.iframeid);
      if (type) {
        expect(r.type).to.equal(type);
      }
      expect(r.method).to.equal('GET');

      if (isBootstrap) {
        expect(r.isPrivate).to.be.false;
        // source refers to top level url, origin is the iframe url
        expect(r.originUrl).to.not.equal(md.url);
        // expect(r.sourceUrl).to.equal(md.url);
      }
    }

    function testResponseCode(r, topic, code) {
      code = code || 200;
      if (topic === 'onHeadersReceived') {
        expect(r.statusCode).to.equal(code);
      } else {
        expect(r.statusCode).to.be.undefined;
      }
    }

    const pageTests = {
      'thirdpartyscript.html': {
        'http://localhost:3000/thirdpartyscript.html': function (r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:3000/test?context=xmlhttpreq&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          testInMainFrame(r, topic, md, 'xmlhttprequest');
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:3000/test?context=thirdpartyscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          testInMainFrame(r, topic, md, 'script');
          testResponseCode(r, topic);
        }
      },

      'injectedscript.html': {
        'http://localhost:3000/injectedscript.html': function (r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:3000/test?context=injectedscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          testInMainFrame(r, topic, md, 'xmlhttprequest');
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:3000/test?context=injectedscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          testInMainFrame(r, topic, md, 'script');
          testResponseCode(r, topic);
        }
      },

      // 'imgtest.html': {
      //   'http://localhost:3000/imgtest.html': function (r, topic, md) {
      //     testMainDocument(r, topic, md);
      //     testResponseCode(r, topic);
      //   },
      //   'http://localhost:3000/test.gif?context=imgtest&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
      //     testInMainFrame(r, topic, md, 'image');
      //     testResponseCode(r, topic);
      //   },
      //   'http://127.0.0.1:3000/test.gif?context=imgtest&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
      //     testInMainFrame(r, topic, md, 'image');
      //     testResponseCode(r, topic);
      //   }
      // },

      // 'crossdomainxhr.html': {
      //   'http://localhost:3000/crossdomainxhr.html': function(r, topic, md) {
      //     testMainDocument(r, topic, md);
      //     testResponseCode(r, topic);
      //   },
      //   'http://localhost:3000/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 11);
      //     testResponseCode(r, topic);
      //   },
      //   'http://127.0.0.1:3000/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 11);
      //     testResponseCode(r, topic);
      //   },
      // },

      'iframetest.html': {
        'http://localhost:3000/iframetest.html': function (r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:3000/test?context=iframetest&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          // skip type check: on FF52 this is incorrectly of type 'other'
          testInMainFrame(r, topic, md, false);
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:3000/thirdpartyscript.html': function (r, topic, md) {
          testIFrameDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:3000/test?context=thirdpartyscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          testInIFrame(r, topic, md, 'script');
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:3000/test?context=xmlhttpreq&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          testInIFrame(r, topic, md, 'xmlhttprequest');
          testResponseCode(r, topic);
        },
      },

      // 'image302test.html': {
      //   'http://localhost:3000/image302test.html': function(r, topic, md) {
      //     testMainDocument(r, topic, md);
      //     testResponseCode(r, topic);
      //   },
      //   'http://localhost:3000/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 3);
      //     testResponseCode(r, topic);
      //   },
      //   'http://localhost:3000/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 3);
      //     testResponseCode(r, topic, 302);
      //   },
      //   'http://cliqztest.com:3000/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 3);
      //     testResponseCode(r, topic);
      //   }
      // },

      'nestediframetest.html': {
        'http://localhost:3000/nestediframetest.html': function (r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:3000/test?context=fetch&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          testInMainFrame(r, topic, md, false);
          testResponseCode(r, topic);
        },
        'http://cliqztest.com:3000/iframetest.html': function (r, topic, md) {
          testIFrameDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://cliqztest.com:3000/test?context=iframetest&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          testInIFrame(r, topic, md, false);
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:3000/thirdpartyscript.html': function (r, topic, md) {
          expect(r.tabId > 0);
          if (topic === 'onBeforeRequest') {
            // expect this to be the first request
            expect(md.iframeid2).to.be.undefined;
            md.iframeid2 = r.frameId;
          }
          expect(r.tabId).to.equal(md.tabId);
          expect(r.parentFrameId).to.equal(md.iframeid);
          expect(r.frameId).to.equal(md.iframeid2);
          expect(r.type).to.equal('sub_frame');
          expect(r.method).to.equal('GET');
          if (isBootstrap) {
            expect(r.isPrivate).to.be.false;
            expect(r.originUrl).to.equal('http://cliqztest.com:3000/iframetest.html');
            expect(r.sourceUrl).to.equal(md.url);
          }
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:3000/test?context=thirdpartyscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          expect(r.tabId).to.equal(md.tabId);
          expect(r.parentFrameId).to.equal(md.iframeid);
          expect(r.frameId).to.equal(md.iframeid2);
          expect(r.type).to.equal('script');
          expect(r.method).to.equal('GET');
          if (isBootstrap) {
            expect(r.isPrivate).to.be.false;
            expect(r.originUrl).to.equal('http://127.0.0.1:3000/thirdpartyscript.html');
            expect(r.sourceUrl).to.equal(md.url);
          }
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:3000/test?context=xmlhttpreq&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function (r, topic, md) {
          expect(r.tabId).to.equal(md.tabId);
          expect(r.parentFrameId).to.equal(md.iframeid);
          expect(r.frameId).to.equal(md.iframeid2);
          expect(r.type).to.equal('xmlhttprequest');
          expect(r.method).to.equal('GET');
          if (isBootstrap) {
            expect(r.isPrivate).to.be.false;
            expect(r.originUrl).to.equal('http://127.0.0.1:3000/thirdpartyscript.html');
            expect(r.sourceUrl).to.equal(md.url);
          }
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

        it('determines correct request metadata', async function () {
          await newTab(url);
          await waitFor(() => {
            const testReqs = new Set(wrCollector.onHeadersReceived
              .filter(req => isTestServerAddress(req.url))
              .map(req => req.url));

            return Object.keys(expectedUrls).every(u => testReqs.has(u));
          });

          const testState = {
            testPage,
            url
          };

          wrCollector.topics.forEach((topic) => {
            const reqs = wrCollector[topic]
              .filter(req => isTestServerAddress(req.url))
              .reduce(function (hash, r) {
                hash[r.url] = r;
                return hash;
              }, Object.create(null));
            for (const seenUrl of Object.keys(expectedUrls)) {
              expect(reqs).to.have.property(seenUrl);
              expectedUrls[seenUrl](reqs[seenUrl], topic, testState);
            }
          });
        });

        async function testRewrite() {
          block = false;
          await newTab(url);
          const numberOfRequestsExpected = Object.keys(expectedUrls).filter(u => u.indexOf('/test') > 0).length;

          await waitFor(async () => (
            (await testServer.getHitCtr('/test')) + (await testServer.getHitCtr('/test.gif')) >= numberOfRequestsExpected
          ));
          const reqsReceived = (await testServer.getAllRequests()).filter(({ path }) => path.startsWith('/test'));

          for (const req of reqsReceived) {
            // EXCEPTION: onBeforeRequest missed for image redirect
            if (req.hostname === 'localhost') {
              expect(req.queryString).to.contain(uid);
            } else {
              expect(req.queryString).to.not.contain(uid);
            }
          }
        }

        async function testBlock() {
          block = true;
          await newTab(url);
          await waitFor(async () => (
            (await testServer.getHitCtr('/test')) + (await testServer.getHitCtr('/test.gif')) >= 1
          ));
          await sleep(500);

          const reqsReceived = (await testServer.getAllRequests()).filter(({ path }) => path.startsWith('/test'));
          expect(reqsReceived).to.have.length(1);
          const [req] = reqsReceived;
          // EXCEPTION: onBeforeRequest missed for image redirect
          if (req.hostname === 'localhost') {
            expect(req.queryString).to.contain(uid);
          } else {
            throw new Error('false');
          }
        }


        context('onBeforeRequest', function () {
          beforeEach(function (done) {
            WebRequest.onBeforeRequest.addListener(
              urlRewriter,
              { urls: ['*://*/*'] },
              ['blocking']
            );
            setTimeout(done, 100);
          });

          afterEach(function () {
            WebRequest.onBeforeRequest.removeListener(urlRewriter);
          });

          it('can rewrite urls', function () {
            return testRewrite();
          });

          it('can block urls', function () {
            return testBlock();
          });
        });

        context('onBeforeSendHeaders', function () {
          beforeEach((done) => {
            WebRequest.onBeforeSendHeaders.addListener(
              urlRewriter,
              { urls: ['*://*/*'] },
              ['blocking']
            );
            setTimeout(done, 100);
          });

          afterEach(function () {
            WebRequest.onBeforeSendHeaders.removeListener(urlRewriter);
          });

          // Seems like we do not block unsafe tokens in onBeforeSendHeaders anymore.
          // it('can rewrite urls', function () {
          //   return testRewrite();
          // });

          it('can block urls', function () {
            return testBlock();
          });
        });
      });
    });
  });
}
