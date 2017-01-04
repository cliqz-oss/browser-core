"use strict";

function waitIfNotReady(fn) {
    var first = true;
    return waitFor(function() {
        if (first) {
            first = false;
            return false;
        }
        return fn();
    });
}
// wait till server is set up
var wait_until_server_up = function (testUrl, count, callback) {
  if ( count <= 0 ) {
    callback("Failed to start server");
    return;
  }
  CliqzUtils.httpGet(testUrl, callback, function() {
    setTimeout(function() {
      wait_until_server_up(testUrl, count - 1, callback);
    }, 100);
  })
};

DEPS.AttrackTest = ["core/utils"];
TESTS.AttrackTest = function (CliqzUtils) {
    var System = CliqzUtils.getWindow().CLIQZ.System,
        CliqzAttrack = System.get("antitracking/attrack").default,
        HashProb = System.get('antitracking/hash').HashProb,
        hp = new HashProb(),
        persist = System.get("antitracking/persistent-state"),
        AttrackBloomFilter = System.get("antitracking/bloom-filter").AttrackBloomFilter,
        datetime = System.get("antitracking/time"),
        pacemaker = System.get("antitracking/pacemaker").default;


    var module_enabled = CliqzUtils.getPref('modules.antitracking.enabled', false);
    // make sure that module is loaded (default it is not initialised on extension startup)
    CliqzUtils.setPref('modules.antitracking.enabled', true);

    before(function() {
      // pause pacemaker to prevent external list updates
      pacemaker.stop();
    });

    after(function() {
      // restart pacemaker
      pacemaker.start();
    });

    describe('platform/browser', function() {
        var browser = System.get('platform/browser');

        describe('isWindowActive', function() {

            it('returns false for none existant tab ids', function() {
                chai.expect(browser.isWindowActive(-1)).to.be.false;
                chai.expect(browser.isWindowActive(0)).to.be.false;
                chai.expect(browser.isWindowActive(532)).to.be.false;
            });

            describe('when tab is opened', function() {
                var win = CliqzUtils.getWindow(),
                    gBrowser = win.gBrowser,
                    tabs = [],
                    tab_id;

                beforeEach(function(done) {
                    testServer.registerPathHandler('/', function(req, res) {
                        res.write('<html><body><p>Hello world</p></body></html');
                    });
                    CliqzAttrack.tp_events._active = {};

                    // get tab id from tp_events (assumption that this is correct)
                    wait_until_server_up('http://cliqztest.com:60508/', 5, function() {
                      tabs.push(gBrowser.addTab("http://cliqztest.com:60508"));
                      waitIfNotReady(function() {
                        return Object.keys(CliqzAttrack.tp_events._active).length > 0;
                      }).then(function() {
                        tab_id = Object.keys(CliqzAttrack.tp_events._active)[0];
                        done();
                      });
                    });
                });

                afterEach(function() {
                    tabs.forEach(function(t) {
                        gBrowser.removeTab(t);
                    });
                    tabs = [];
                });

                it('returns true for open tab id', function() {
                  return waitIfNotReady(function() {
                    return browser.isWindowActive(tab_id) === true;
                  });
                });

                describe('when tab is closed', function() {

                    beforeEach(function() {
                        gBrowser.removeTab(tabs.shift());
                    });

                    it('returns false for closed tab id', function() {
                        chai.expect(browser.isWindowActive(tab_id)).to.be.false;
                    });
                });
            });
        });

    });

    describe('CliqzAttrack.tp_events', function() {

        var urlInfo = CliqzUtils.getWindow().CLIQZ.System.get('antitracking/url').URLInfo;

        describe('Integration', function() {
            var win = CliqzUtils.getWindow(),
                gBrowser = win.gBrowser,
                tabs = [];

            beforeEach(function() {
                CliqzAttrack.tp_events.commit(true);
                CliqzAttrack.tp_events._staged = [];
                // prevent data push during the test
                CliqzAttrack._last_push = (new Date()).getTime();
            });

            afterEach(function() {
                closeAllTabs(gBrowser);
                tabs = [];
            });

            it('should initially have no active tabs', function() {
                chai.expect(CliqzAttrack.tp_events._active).to.be.empty;
            });

            describe('when tabs are opened', function() {

                var tab_id = 0,
                    page_load;

                beforeEach(function(done) {
                    testServer.registerPathHandler('/', function(req, res) {
                        res.write('<html><body><p>Hello world</p></body></html');
                    });
                    testServer.registerPathHandler('/privacy', function(req, res) {
                        res.write('<html><body><p>Hello private world</p></body></html');
                    });


                    wait_until_server_up('http://localhost:60508/', 5, function() {
                      tabs.push(gBrowser.addTab("http://localhost:60508"));
                      tabs.push(gBrowser.addTab("http://localhost:60508/privacy#saferWeb"));
                      done();
                    });
                });

                it('should add tabs to _active', function(done) {

                    this.timeout(20000);

                    waitIfNotReady(function() {
                        return Object.keys(CliqzAttrack.tp_events._active).length > 0;
                    }).then(function() {
                        chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(2);
                        tab_id = Object.keys(CliqzAttrack.tp_events._active)[0];
                        page_load = CliqzAttrack.tp_events._active[tab_id];
                        chai.expect(page_load).to.include.keys('hostname', 'url', 'path');
                        chai.expect(page_load.url).to.equal('http://localhost:60508/');
                        chai.expect(page_load.hostname).to.equal('localhost');
                        // md5('/')
                        chai.expect(page_load.path).to.equal('6666cd76f96956469e7be39d750cc7d9'.substring(0, 16));
                        chai.expect(page_load.tps).to.be.empty;
                        done();
                    });

                });

                describe('when a tab is closed', function() {
                    beforeEach(function() {
                        gBrowser.removeTab(tabs.shift());
                    });

                    describe('CliqzAttrack.tp_events.commit', function() {

                        it('should stage closed tabs only', function() {
                            this.timeout(20000);

                            return waitIfNotReady(function() {
                              CliqzAttrack.tp_events.commit(true);
                              return Object.keys(CliqzAttrack.tp_events._active).length === 1;
                            }).then(function() {
                              chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(1);
                              // check staged tab
                              if (CliqzAttrack.tp_events._staged.length > 1) {
                                var urls = CliqzAttrack.tp_events._staged.map(function(s) { return s.url });
                                throw urls;
                              }
                              chai.expect(CliqzAttrack.tp_events._staged).to.have.length(1);
                              chai.expect(CliqzAttrack.tp_events._staged[0].url).to.equal('http://localhost:60508/');

                              // check active tab
                              tab_id = Object.keys(CliqzAttrack.tp_events._active)[0];
                              chai.expect(CliqzAttrack.tp_events._active[tab_id].url).to.equal("http://localhost:60508/privacy#saferWeb");
                            });
                        });
                    });

                });

                describe('when new page is loaded in existing tab', function() {

                    beforeEach(function() {
                        var wait = waitFor( function() {
                          return gBrowser.getBrowserForTab(tabs[0]).currentURI.spec === "http://cliqztest.de:60508/"
                        });
                        gBrowser.getBrowserForTab(tabs[0]).loadURI("http://cliqztest.de:60508/");
                        return wait;
                    });

                    describe('CliqzAttrack.tp_events.commit', function() {
                        beforeEach(function() {
                            CliqzAttrack.tp_events.commit(true);
                        });

                        it('should stage previous page load', function() {
                          return waitIfNotReady(function() {
                            CliqzAttrack.tp_events.commit(true);
                            return Object.keys(CliqzAttrack.tp_events._active).length === 2;
                          }).then(function() {
                            // still have 2 active tabs
                            chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(2);
                            // check staged tab
                            if (CliqzAttrack.tp_events._staged.length > 1) {
                                var urls = CliqzAttrack.tp_events._staged.map(function(s) { return s.url });
                                throw urls;
                            }
                            chai.expect(CliqzAttrack.tp_events._staged).to.have.length(1);
                            chai.expect(CliqzAttrack.tp_events._staged[0].url).to.equal('http://localhost:60508/');

                            // check active tabs
                            var tabUrls = Object.keys(CliqzAttrack.tp_events._active).map(function(tab_id) {
                              return CliqzAttrack.tp_events._active[tab_id].url;
                            });
                            chai.expect(tabUrls).to.contain("http://cliqztest.de:60508/");
                            chai.expect(tabUrls).to.contain("http://localhost:60508/privacy#saferWeb");
                          });
                        });
                    });

                });
            });

            describe('redirects', function() {

              var server_port, hit_target = false, proxy_type = null;
              var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);

              beforeEach(function(done) {
                server_port = testServer.port;
                // 302 redirect case
                testServer.registerPathHandler('/302', function(request, response) {
                  response.setStatusLine(request.httpVersion, 302, 'Redirect');
                  response.setHeader('Location', 'http://cliqztest.de:'+ server_port +'/target');
                  response.write("<html><body></body></html>");
                });
                // 303 redirect case
                testServer.registerPathHandler('/303', function(request, response) {
                  response.setStatusLine(request.httpVersion, 303, 'Redirect');
                  response.setHeader('Location', 'http://cliqztest.de:'+ server_port +'/target');
                  response.write("<html><body></body></html>");
                });
                // js redirect case
                testServer.registerPathHandler('/js', function(request, response) {
                  response.write("<html><body><script>window.location=\"http://cliqztest.de:"+ server_port +"/target\"</script></body></html>")
                });
                testServer.registerPathHandler('/target', function(request, response) {
                  hit_target = true;
                  response.write("<html><body></body></html>");
                });
                wait_until_server_up("http://localhost:"+ server_port +"/js", 5, () => {
                  done();
                });
              });

              ['302', '303', 'js'].forEach(function(kind) {
                describe(kind, function() {
                  beforeEach(function() {
                    hit_target = false;
                    tabs.push(gBrowser.addTab("http://localhost:"+ server_port +"/"+ kind));
                  });

                  it('gets host at end of redirect chain', function(done) {
                    this.timeout(20000);
                    waitIfNotReady(function() {
                        return hit_target;
                      }).then(function() {
                        console.log(CliqzAttrack.tp_events._active);
                        chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(1);
                        var tabid = Object.keys(CliqzAttrack.tp_events._active)[0];
                        chai.expect(CliqzAttrack.tp_events._active[tabid].hostname).to.equal("cliqztest.de");
                        if (kind != 'js') {
                          // check original is in redirect chain
                          chai.expect(CliqzAttrack.tp_events._active[tabid].redirects).to.have.length(1);
                          chai.expect(CliqzAttrack.tp_events._active[tabid].redirects[0]).to.equal("localhost");
                        }
                      }).then(done, done);
                  });
              });
              });

            });
        });

        describe('onFullPage', function() {

            var url_parts = urlInfo.get("https://cliqz.com"),
                mock_tab_id = 43;

            beforeEach(function() {
                CliqzAttrack.tp_events.commit(true);
                CliqzAttrack.tp_events._staged = [];
                // prevent data push during the test
                CliqzAttrack._last_push = (new Date()).getTime();
            });

            it("adds a tab to _active with request context's tab ID", function() {
                var page_load = CliqzAttrack.tp_events.onFullPage(url_parts, mock_tab_id);

                chai.expect(page_load).is.not.null;
                chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(1);
                chai.expect(CliqzAttrack.tp_events._active).to.have.property(mock_tab_id);
                chai.expect(CliqzAttrack.tp_events._active[mock_tab_id].url).to.equal(url_parts.toString());
            });

            it("does not add a tab to _active if the url is malformed", function() {
                [null, undefined, 'http://cliqz.com', urlInfo.get("/home/cliqz"), urlInfo.get("about:config")].forEach(function(url) {
                    var page_load = CliqzAttrack.tp_events.onFullPage(url, mock_tab_id);

                    chai.expect(page_load).is.null;
                    chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(0);
                });
            });

            it("does not add a tab to _active if the tab ID <= 0", function() {
                [null, undefined, 0, -1].forEach(function(id) {
                    var page_load = CliqzAttrack.tp_events.onFullPage(url_parts, id);

                    chai.expect(page_load).is.null;
                    chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(0);
                });
            });

        });

        describe('get', function() {

            var src_url = "https://cliqz.com",
                src_url_parts = urlInfo.get(src_url),
                url = "https://example.com/beacon",
                url_parts = urlInfo.get(url),
                mock_tab_id = 34;

            var testInvalidTabIds = function() {
                [undefined, null, 0, -1, 552].forEach(function(tab_id) {
                    var req = CliqzAttrack.tp_events.get(url, url_parts, src_url, src_url_parts, tab_id);
                    chai.expect(req).to.be.null;
                });
            };

            beforeEach(function() {
                CliqzAttrack.tp_events.commit(true);
                CliqzAttrack.tp_events._staged = [];
                // prevent data push during the test
                CliqzAttrack._last_push = (new Date()).getTime();
            });

            describe('after page load', function() {
                var page_load;

                beforeEach(function() {
                    page_load = CliqzAttrack.tp_events.onFullPage(src_url_parts, mock_tab_id);
                });

                it('returns a stats object for the specified page load and third party', function() {
                    var req = CliqzAttrack.tp_events.get(url, url_parts, src_url, src_url_parts, mock_tab_id);

                    chai.expect(req).to.not.be.null;
                    chai.expect(req['c']).to.equal(0);
                    chai.expect(page_load.tps).to.have.property(url_parts.hostname);
                    chai.expect(page_load.tps[url_parts.hostname]).to.have.property(url_parts.path);
                    chai.expect(page_load.tps[url_parts.hostname][url_parts.path]).to.equal(req);
                });

                it('returns null if source tab is invalid', testInvalidTabIds);

                it('returns null if third party referrer is not related to the page load', function() {
                    var alt_url = "https://www.w3.org/",
                        alt_url_parts = urlInfo.get(alt_url);

                    var req = CliqzAttrack.tp_events.get(url, url_parts, alt_url, alt_url_parts, mock_tab_id);

                    chai.expect(req).to.be.null;
                });

                it('third party referrer relation is transative', function() {
                    var alt_url = "https://www.w3.org/",
                        alt_url_parts = urlInfo.get(alt_url);

                    CliqzAttrack.tp_events.get(url, url_parts, src_url, src_url_parts, mock_tab_id);
                    var req = CliqzAttrack.tp_events.get(alt_url, alt_url_parts, url, url_parts, mock_tab_id);

                    chai.expect(req).to.not.be.null;
                    chai.expect(req['c']).to.equal(0);
                    chai.expect(page_load.tps).to.have.property(url_parts.hostname);
                    chai.expect(page_load.tps).to.have.property(alt_url_parts.hostname);
                    chai.expect(page_load.tps[alt_url_parts.hostname]).to.have.property(alt_url_parts.path);
                    chai.expect(page_load.tps[alt_url_parts.hostname][alt_url_parts.path]).to.equal(req);
                });
            });

            it('returns null if onFullPage has not been called for the referrer', function() {
                var req = CliqzAttrack.tp_events.get(url, url_parts, src_url, src_url_parts, mock_tab_id);

                chai.expect(req).to.be.null;
                chai.expect(CliqzAttrack.tp_events._active).to.be.empty;
            });

            it('returns null if source tab is invalid', testInvalidTabIds);
        });

        describe('PageLoadData', function() {

            var page_load,
                url = 'https://cliqz.com/privacy#saferWeb',
                url_parts = urlInfo.get(url);

            beforeEach(function() {
                page_load = CliqzAttrack.tp_events.onFullPage(url_parts, 1);
            });

            it('should have initial attributes from source url', function() {
                console.log(page_load);
                chai.expect(page_load.url).to.equal(url);
                chai.expect(page_load.hostname).to.equal(url_parts.hostname);
                chai.expect(page_load.tps).to.be.empty;
                chai.expect(page_load.path).to.equal(page_load._shortHash(url_parts.path));
            });

            describe('getTpUrl', function() {
                var tp_url;

                beforeEach(function() {
                    tp_url = page_load.getTpUrl('hostname', '/');
                });

                it('should create a stat entry for the given page load', function() {
                    chai.expect(page_load.tps).to.have.property('hostname');
                    chai.expect(page_load.tps['hostname']).to.have.property('/');
                    chai.expect(page_load.tps['hostname']['/']).to.equal(tp_url);
                });

                it('should return the same object on repeated calls', function() {
                    tp_url['c'] += 1;

                    chai.expect(page_load.getTpUrl('hostname', '/')).to.equal(tp_url);
                });
            });

            describe('asPlainObject', function() {

                it('should contain page load metadata', function() {
                    var plain = page_load.asPlainObject();
                    chai.expect(plain).to.include.keys('hostname', 'path', 'c', 't', 'ra', 'tps');
                });

                it('should hash page load host', function() {
                    var plain = page_load.asPlainObject();
                    // md5('cliqz.com')
                    chai.expect(plain.hostname).to.equal("716378bd1d4c36198e252476ef80c66e".substring(0, 16));
                });

                it('should sum third party stats', function() {
                    var paths = ['script.js', 'beacon'],
                        tps = paths.map(function(p) {
                            return page_load.getTpUrl('example.com', p);
                        });
                    tps.forEach(function(tp) {
                        tp['c'] += 1;
                    });

                    var plain = page_load.asPlainObject();
                    chai.expect(Object.keys(plain.tps)).to.have.length(1);
                    chai.expect(plain.tps).to.have.property('example.com');
                    chai.expect(plain.tps['example.com']['c']).to.equal(2);
                    chai.expect(plain.tps['example.com']['paths']).to.have.length(2);
                    chai.expect(plain.tps['example.com']['paths']).to.eql(paths.map(page_load._shortHash));
                });

                it('should prune all zero stats', function() {
                    var paths = ['script.js', 'beacon'],
                        tps = paths.map(function(p) {
                            return page_load.getTpUrl('example.com', p);
                        }),
                        paths_hash = paths.map(page_load._shortHash);
                    tps.forEach(function(tp) {
                        tp['c'] += 1;
                    });
                    tps[1]['has_qs'] = 1;

                    var plain = page_load.asPlainObject();
                    chai.expect(plain.tps['example.com']).to.eql({'c': 2, 'has_qs': 1, 'paths': paths_hash});
                });
            });

        });
    });

    describe('CliqzAttrack.isHash', function() {

        // we test between 7 to 12 characters
        var not_hash = ['',
            'Firefox',
            'cliqz.com', // a url
            'anti-tracking',
            'front/ng',
            'javascript',
            'callback'
            ];

        var hashes = ['04C2EAD03B',
            '54f5095c96e',
            'B62a15974a93',
            '22163a4ff903',
            '468x742',
            '1021x952',
            '1024x768',
            '1440x900'
        ]

        not_hash.forEach(function(str) {
          it("'" + str + "' is not a hash", function() {
            chai.expect(hp.isHash(str)).to.be.false;
          })
        });

        hashes.forEach(function(str) {
          it("'" + str + "' is a hash", function() {
            chai.expect(hp.isHash(str)).to.be.true;
          })
        });

    });

    describe('CliqzAttrack.getGeneralDomain', function() {

        var getGeneralDomain = CliqzUtils.getWindow().CLIQZ.System.get('antitracking/domain').getGeneralDomain;
        var spec = {
          'cliqz.com': ['cliqz.com', 'www.cliqz.com', 'a.b.cliqz.com'],
          'example.co.uk': ['example.co.uk', 'test.example.co.uk'],
          '127.0.0.1': ['127.0.0.1'],
          '1.2.3.4': ['1.2.3.4']
        };

        for (var general_domain in spec) {
            spec[general_domain].forEach(function(sub_domain) {
                var gen = general_domain;
                it(sub_domain +' has general domain '+ gen, function() {
                    chai.expect(getGeneralDomain(sub_domain)).to.eql(gen);
                });
            });
        }
    });

    describe('CliqzAttrack list update', function() {

      var mock_bloom_filter_major = '{"bkt": [1, 2, 3, 4, 5], "k": 5}',
        mock_bloom_filter_minor = '{"bkt": [1, 0, 0, 0, 0], "k": 5}',
        mock_bloom_filter_config = '{"major": "0", "minor": "1"}',
        mock_bloom_filter_config_url = null,
        mock_bloom_filter_base_url = null;

      beforeEach(function() {
        // serve fake whitelists
        testServer.registerPathHandler('/bloom_filter/0/0.gz', function(request, response) {
          response.write(mock_bloom_filter_major);
        });
        testServer.registerPathHandler('/bloom_filter/0/1.gz', function(request, response) {
          response.write(mock_bloom_filter_minor);
        });
        testServer.registerPathHandler('/bloom_filter/config', function(request, response) {
          response.write(mock_bloom_filter_config);
        });
        mock_bloom_filter_config_url = 'http://localhost:' + testServer.port + '/bloom_filter/config',
        mock_bloom_filter_base_url = 'http://localhost:' + testServer.port + '/bloom_filter/';
      });

      describe('loadBloomFilter', function() {
        var bloomFilter;

        beforeEach(function() {
          bloomFilter = new AttrackBloomFilter(mock_bloom_filter_config_url, mock_bloom_filter_base_url);
        });

        it ('bloom filter init', function() {
          bloomFilter.init();
          return waitFor(function() {
            return bloomFilter.bloomFilter != null && bloomFilter.version != null;
          }).then(function() {
            chai.expect(bloomFilter.version.major).to.equal('0');
            chai.expect(bloomFilter.bloomFilter.k).to.equal(5);
          });
        });

        it ('bloom filter update', function() {
          bloomFilter.update();
          return waitFor(function() {
            return bloomFilter.bloomFilter != null && bloomFilter.version != null;
          }).then(function() {
            chai.expect(bloomFilter.version.major).to.equal('0');
            chai.expect(bloomFilter.bloomFilter.k).to.equal(5);
          });
        });
      });
    });

    describe('isSourceWhitelisted', function() {

      it('returns false for non whitelisted domain', function() {
        chai.expect(CliqzAttrack.isSourceWhitelisted('example.com')).to.be.false;
      });

      describe('addSourceDomainToWhitelist', function() {

        afterEach(function() {
          CliqzAttrack.removeSourceDomainFromWhitelist('example.com');
        });

        it('adds a source domain to the whitelist', function() {
          CliqzAttrack.addSourceDomainToWhitelist('example.com');
          chai.expect(CliqzAttrack.isSourceWhitelisted('example.com')).to.be.true;
        });

        it('does not add any other domains to the whitelist', function() {
          CliqzAttrack.addSourceDomainToWhitelist('example.com');
          chai.expect(CliqzAttrack.isSourceWhitelisted('www.example.com')).to.be.false;
        });

      });

      describe('removeSourceDomainFromWhitelist', function() {

        afterEach(function() {
          CliqzAttrack.removeSourceDomainFromWhitelist('example.com');
          CliqzAttrack.removeSourceDomainFromWhitelist('www.example.com');
        });

        it('removes a domain from the whitelist', function() {
          CliqzAttrack.addSourceDomainToWhitelist('example.com');
          CliqzAttrack.removeSourceDomainFromWhitelist('example.com');
          chai.expect(CliqzAttrack.isSourceWhitelisted('example.com')).to.be.false;
        });

        it('does not remove other domains', function() {
          CliqzAttrack.addSourceDomainToWhitelist('example.com');
          CliqzAttrack.addSourceDomainToWhitelist('www.example.com');
          CliqzAttrack.removeSourceDomainFromWhitelist('example.com');

          chai.expect(CliqzAttrack.isSourceWhitelisted('example.com')).to.be.false;
          chai.expect(CliqzAttrack.isSourceWhitelisted('www.example.com')).to.be.true;
        });
      });
    });

    describe('Tracking.txt', function() {

        it ('parse rules correctly', function() {
            var parser = CliqzUtils.getWindow().CLIQZ.System.get('antitracking/tracker-txt').trackerRuleParser,
                txt = 'R site1.com empty\nR   site2.com\tplaceholder\nnot a rule',
                rules = [];
            parser(txt, rules);
            chai.expect(rules).to.deep.equal([{site: 'site1.com', rule: 'empty'}, {site: 'site2.com', rule: 'placeholder'}])
        });

        it ('ignore comments', function() {
            var parser = CliqzUtils.getWindow().CLIQZ.System.get('antitracking/tracker-txt').trackerRuleParser,
                txt = '# comment\n! pass\nR site1.com empty\nR site2.com placeholder\nnot a rule',
                rules = [];
            parser(txt, rules);
            chai.expect(rules).to.deep.equal([{site: 'site1.com', rule: 'empty'}, {site: 'site2.com', rule: 'placeholder'}])
        });

        it ('apply correct rule to 3rd party', function() {
            var TT = CliqzUtils.getWindow().CLIQZ.System.get('antitracking/tracker-txt'),
                txt = '# comment\n! pass\nR aaa.site1.com empty\nR site1.com placeholder\nnot a rule',
                parseURL = CliqzUtils.getWindow().CLIQZ.System.get("antitracking/url").parseURL,
                r = TT.TrackerTXT.get(parseURL('http://www.google.com/'));
            TT.trackerRuleParser(txt, r.rules);
            r.status = 'update';
            chai.expect(r.getRule('bbbaaa.site1.com')).to.equal('empty');
            chai.expect(r.getRule('aa.site1.com')).to.equal('placeholder');
            chai.expect(r.getRule('aa.site2.com')).to.equal(TT.getDefaultTrackerTxtRule());
        });
    });
};

TESTS.AttrackTest.MIN_BROWSER_VERSION = 39;
