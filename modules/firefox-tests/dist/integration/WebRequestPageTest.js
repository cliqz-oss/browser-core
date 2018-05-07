"use strict";

TESTS.WebRequestPageTest = function(CliqzUtils) {
  var webrequest = getWindow().CLIQZ.TestHelpers.webrequest;
  var browser = getWindow().CLIQZ.TestHelpers.browser;

  describe('WebRequest example pages', function() {
    var wrCollector = {
      topics: ['onBeforeRequest', 'onBeforeSendHeaders', 'onHeadersReceived'],
      setUp: function() {
        var collector = this;
        this.topics.forEach(function(t) {
          collector[t] = [];
          collector[t + 'Ctr'] = function(req) {
            collector[t].push(req);
          };
          webrequest[t].addListener(
            collector[t + 'Ctr'],
            { urls: ['http://*'] }
          );
        });
      },
      tearDown: function() {
        for (var t of this.topics) {
          this[t] = [];
          webrequest[t].removeListener(this[t + 'Ctr']);
        }
      }
    };
    var baseUrl = 'http://localhost:' + testServer.port,
        reqsReceived = [];

    var collect_request_parameters = function(request, response) {
      var r_obj = {
          method: request.method,
          host: request.host,
          path: request.path,
          qs: request.queryString
        },
        header_iter = request.headers,
        headers = {};

      while(header_iter.hasMoreElements()) {
        var header_name = header_iter.getNext().toString();
        headers[header_name] = request.getHeader(header_name);
      }
      r_obj['headers'] = headers;

      response.setHeader('Set-Cookie', 'uid=abcdefghijklmnop; Domain='+r_obj.host+'; Path=/');
      if(r_obj.host != "localhost") {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // log request
      console.log(r_obj);
      reqsReceived.push(r_obj);

      // prevent caching
      response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');

      // send an appropriate response
      if (request.path.indexOf('.gif') > 0) {
        var imgFile = ['firefox-tests', 'mockserver', 'Transparent.gif'];
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
      testServer.registerDirectory('/', ['firefox-tests', 'mockserver']);
      testServer.registerDirectory('/vendor/', ['vendor']);
      // add specific handler for /test which will collect request parameters for testing.
      testServer.registerPathHandler('/test', collect_request_parameters);
      testServer.registerPathHandler('/test.gif', collect_request_parameters);

      var redirect302 = function(request, response) {
        console.log(request.path);
        response.setStatusLine('1.1', 302);
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        var path = request.path.indexOf('.gif') > 0 ? 'test.gif' : 'test';
        response.setHeader('Location', 'http://cliqztest.com:'+ testServer.port +'/' + path + '?'+ request.queryString);
      };
      testServer.registerPathHandler('/tracker302', redirect302);
      testServer.registerPathHandler('/tracker302.gif', redirect302);
    }

    function isTestServerAddress(u) {
      return u.indexOf('favicon.ico') === -1 && ['localhost', '127.0.0.1', 'cliqztest.com'].some( function(d) {
        return u.startsWith('http://' + d + ':' + testServer.port);
      });
    }

    function metadataListToObject(reqs) {
      var o = {};
      reqs.forEach(function(r) {
        o[r.url] = r;
      });
      return o;
    }

    beforeEach( function() {
      wrCollector.setUp();
      setupAttrackTestServer();
      reqsReceived = [];
    });

    afterEach( function() {
      wrCollector.tearDown();
    });

    function testMainDocument(r, topic, md) {
      console.log('main doc', r);
      chai.expect(r.tabId > 0);
      if (topic === 'onBeforeRequest') {
        // expect this to be the first request
        chai.expect(md.tabId).to.be.undefined;
        md.tabId = r.tabId;
      }
      chai.expect(r.tabId).to.equal(md.tabId)
      chai.expect(r.parentFrameId).to.equal(-1);
      chai.expect(r.frameId).to.equal(0);
      chai.expect(r.type).to.equal('main_frame');
      chai.expect(r.method).to.equal('GET');
      chai.expect(r.isPrivate).to.be.false;
      // chai.expect(r.originUrl).to.equal(md.url);
    }

    function testInMainFrame(r, topic, md, type) {
      chai.expect(r.tabId).to.equal(md.tabId);
      if (type) {
        chai.expect(r.type).to.equal(type);
      }
      chai.expect(r.method).to.equal('GET');
      chai.expect(r.isPrivate).to.be.false;
      chai.expect(r.originUrl).to.equal(md.url);
      chai.expect(r.parentFrameId).to.equal(-1);
    }

    function testIFrameDocument(r, topic, md) {
      chai.expect(r.tabId > 0);
      if (topic === 'onBeforeRequest') {
        // expect this to be the first request
        chai.expect(md.iframeid).to.be.undefined;
        md.iframeid = r.frameId;
      }
      chai.expect(r.tabId).to.equal(md.tabId)
      chai.expect(r.parentFrameId).to.equal(0);
      chai.expect(r.frameId).to.equal(md.iframeid);
      chai.expect(r.type).to.equal('sub_frame');
      chai.expect(r.method).to.equal('GET');
      chai.expect(r.isPrivate).to.be.false;
      chai.expect(r.originUrl).to.equal(md.url);
      // chai.expect(r.sourceUrl).to.equal(md.url);
    }

    function testInIFrame(r, topic, md, type) {
      chai.expect(r.tabId).to.equal(md.tabId)
      chai.expect(r.parentFrameId).to.equal(0);
      chai.expect(r.frameId).to.equal(md.iframeid);
      if (type) {
        chai.expect(r.type).to.equal(type);
      }
      chai.expect(r.method).to.equal('GET');
      chai.expect(r.isPrivate).to.be.false;
      // source refers to top level url, origin is the iframe url
      chai.expect(r.originUrl).to.not.equal(md.url);
      // chai.expect(r.sourceUrl).to.equal(md.url);
    }

    function testResponseCode(r, topic, code) {
      code = code || 200;
      if (topic === 'onHeadersReceived') {
        chai.expect(r.statusCode).to.equal(code);
      } else {
        chai.expect(r.statusCode).to.be.undefined;
      }
    }

    var pageTests = {
      'thirdpartyscript.html': {
        'http://localhost:60508/thirdpartyscript.html': function(r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:60508/test?context=xmlhttpreq&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInMainFrame(r, topic, md, 'xmlhttprequest');
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/test?context=thirdpartyscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInMainFrame(r, topic, md, 'script');
          testResponseCode(r, topic);
        }
      },

      'injectedscript.html': {
        'http://localhost:60508/injectedscript.html': function(r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:60508/test?context=injectedscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInMainFrame(r, topic, md, 'xmlhttprequest');
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/test?context=injectedscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInMainFrame(r, topic, md, 'script');
          testResponseCode(r, topic);
        }
      },

      'imgtest.html': {
        'http://localhost:60508/imgtest.html': function(r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:60508/test.gif?context=imgtest&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInMainFrame(r, topic, md, 'image');
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/test.gif?context=imgtest&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInMainFrame(r, topic, md, 'image');
          testResponseCode(r, topic);
        }
      },

      // 'crossdomainxhr.html': {
      //   'http://localhost:60508/crossdomainxhr.html': function(r, topic, md) {
      //     testMainDocument(r, topic, md);
      //     testResponseCode(r, topic);
      //   },
      //   'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 11);
      //     testResponseCode(r, topic);
      //   },
      //   'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 11);
      //     testResponseCode(r, topic);
      //   },
      // },

      'iframetest.html': {
        'http://localhost:60508/iframetest.html': function(r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:60508/test?context=iframetest&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          // skip type check: on FF52 this is incorrectly of type 'other'
          testInMainFrame(r, topic, md, false);
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/thirdpartyscript.html': function(r, topic, md) {
          testIFrameDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/test?context=thirdpartyscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInIFrame(r, topic, md, 'script');
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/test?context=xmlhttpreq&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInIFrame(r, topic, md, 'xmlhttprequest');
          testResponseCode(r, topic);
        },
      },

      // 'image302test.html': {
      //   'http://localhost:60508/image302test.html': function(r, topic, md) {
      //     testMainDocument(r, topic, md);
      //     testResponseCode(r, topic);
      //   },
      //   'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 3);
      //     testResponseCode(r, topic);
      //   },
      //   'http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 3);
      //     testResponseCode(r, topic, 302);
      //   },
      //   'http://cliqztest.com:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
      //     testInMainFrame(r, topic, md, 3);
      //     testResponseCode(r, topic);
      //   }
      // },

      'nestediframetest.html': {
        'http://localhost:60508/nestediframetest.html': function(r, topic, md) {
          testMainDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://localhost:60508/test?context=fetch&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInMainFrame(r, topic, md, false);
          testResponseCode(r, topic);
        },
        'http://cliqztest.com:60508/iframetest.html': function(r, topic, md) {
          testIFrameDocument(r, topic, md);
          testResponseCode(r, topic);
        },
        'http://cliqztest.com:60508/test?context=iframetest&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          testInIFrame(r, topic, md, false);
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/thirdpartyscript.html': function(r, topic, md) {
          chai.expect(r.tabId > 0);
          if (topic === 'onBeforeRequest') {
            // expect this to be the first request
            chai.expect(md.iframeid2).to.be.undefined;
            md.iframeid2 = r.frameId;
          }
          chai.expect(r.tabId).to.equal(md.tabId);
          chai.expect(r.parentFrameId).to.equal(md.iframeid);
          chai.expect(r.frameId).to.equal(md.iframeid2);
          chai.expect(r.type).to.equal('sub_frame');
          chai.expect(r.method).to.equal('GET');
          chai.expect(r.isPrivate).to.be.false;
          chai.expect(r.originUrl).to.equal("http://cliqztest.com:60508/iframetest.html");
          chai.expect(r.sourceUrl).to.equal(md.url);
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/test?context=thirdpartyscript&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          chai.expect(r.tabId).to.equal(md.tabId);
          chai.expect(r.parentFrameId).to.equal(md.iframeid);
          chai.expect(r.frameId).to.equal(md.iframeid2);
          chai.expect(r.type).to.equal('script');
          chai.expect(r.method).to.equal('GET');
          chai.expect(r.isPrivate).to.be.false;
          chai.expect(r.originUrl).to.equal("http://127.0.0.1:60508/thirdpartyscript.html");
          chai.expect(r.sourceUrl).to.equal(md.url);
          testResponseCode(r, topic);
        },
        'http://127.0.0.1:60508/test?context=xmlhttpreq&callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134': function(r, topic, md) {
          chai.expect(r.tabId).to.equal(md.tabId);
          chai.expect(r.parentFrameId).to.equal(md.iframeid);
          chai.expect(r.frameId).to.equal(md.iframeid2);
          chai.expect(r.type).to.equal('xmlhttprequest');
          chai.expect(r.method).to.equal('GET');
          chai.expect(r.isPrivate).to.be.false;
          chai.expect(r.originUrl).to.equal("http://127.0.0.1:60508/thirdpartyscript.html");
          chai.expect(r.sourceUrl).to.equal(md.url);
          testResponseCode(r, topic);
        }
      }
    };

    var uid = '04C2EAD03BAB7F5E-2E85855CF4C75134',
        block = false;
    function urlRewriter(req) {
      if (req.url.indexOf('localhost') === -1 && req.url.indexOf(uid) > -1) {
        if (block) {
          return { cancel: true };
        } else {
          return {
            redirectUrl: req.url.replace(uid, '')
          }
        }
      } else {
        return {};
      }
    }

    Object.keys(pageTests).forEach((testPage) => {

      context(testPage, function() {
        var url = baseUrl + '/' + testPage,
          expectedUrls = pageTests[testPage];

        it('determines correct request metadata', function() {
          this.timeout(30000);
          return browser.newTab(url)
            .then(() => waitFor(() => {
              var testReqs = wrCollector.onHeadersReceived.filter(
                req => isTestServerAddress(req.url)
              ).map(req => req.url);
              testReqs = new Set(testReqs);
              return Object.keys(expectedUrls).every(url => testReqs.has(url));
            }))
            .then(function() {
              var testState = {
                testPage,
                url
              };
              for (var topic of wrCollector.topics) {
                var reqs = wrCollector[topic].filter( function(req) { return isTestServerAddress(req.url) }).reduce(function(hash, r) {
                  hash[r.url] = r;
                  return hash;
                }, Object.create(null));
                for (var seenUrl of Object.keys(expectedUrls)) {
                  chai.expect(reqs).to.have.property(seenUrl);
                  // console.log(testState, 'testState');
                  expectedUrls[seenUrl](reqs[seenUrl], topic, testState);
                }
              }
            });
        });

        function testRewrite() {
          block = false;
          reqsReceived = [];
          return browser.newTab(url).then(function () {
            console.log('----', 'test rewrite', testPage);
            var nExpected = Object.keys(expectedUrls).filter((url) => url.indexOf('/test') > 0).length;
            return waitFor(function() {
              return reqsReceived.length >= nExpected;
            }).then(function() {

              console.log('xxx', reqsReceived);

              for (var req of reqsReceived) {
                // EXCEPTION: onBeforeRequest missed for image redirect
                if (req.host === 'localhost') {
                  chai.expect(req.qs).to.contain(uid);
                } else {
                  chai.expect(req.qs).to.not.contain(uid);
                }
              }
            });
          });
        }

        function testBlock() {
          block = true;
          reqsReceived = [];
          return browser.newTab(url).then(function () {
            console.log('----', 'test block', testPage);
            return waitFor(function() {
              return reqsReceived.length >= 1;
            }).then(function() {
              // delay assertion in case
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  console.log(reqsReceived);
                  try {
                    chai.expect(reqsReceived).to.have.length(1);
                    for (var req of reqsReceived) {
                      // EXCEPTION: onBeforeRequest missed for image redirect
                      if (req.host === 'localhost') {
                        chai.expect(req.qs).to.contain(uid);
                      } else {
                        chai.assert(false);
                      }
                    }
                    resolve();
                  } catch(e) {
                    reject(e);
                  }
                }, 500);
              });
            });
          });
        }


        context('onBeforeRequest', function () {
          beforeEach(function (done) {
            webrequest.onBeforeRequest.addListener(
              urlRewriter,
              { urls: ['http://*'] },
              ['blocking']
            );
            setTimeout(done, 100);
          });

          afterEach(function () {
            webrequest.onBeforeRequest.removeListener(urlRewriter);
          });

          // when redirecting scripts specfied in the DOM in onBeforeRequest we get a duplicate request
          it('can rewrite urls', function() {
            this.timeout(30000);
            return testRewrite(testPage === 'thirdpartyscript.html')
          });

          it('can block urls', function() {
            return testBlock()
          });

        });

        context('onBeforeSendHeaders', function() {
          beforeEach(function(done) {
            webrequest.onBeforeSendHeaders.addListener(
              urlRewriter,
              { urls: ['http://*'] },
              ['blocking']
            );
            setTimeout(done, 100);
          });

          afterEach(function() {
            webrequest.onBeforeSendHeaders.removeListener(urlRewriter);
          });

          it.skip('can rewrite urls', function() {
            return testRewrite();
          });

          it('can block urls', function() {
            return testBlock()
          });
        });
      });
    });
  });
};
