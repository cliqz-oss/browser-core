/* global chai, closeAllTabs, getModule, getWindow, TESTS,
  testServer, waitFor, waitForAsync, waitUntilServerUp */

/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */
/* eslint no-restricted-syntax: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint no-console: 'off' */

TESTS.AttrackIntegrationTest = function (CliqzUtils) {
  const CLIQZ = CliqzUtils.getWindow().CLIQZ;
  if (!CLIQZ.app.modules.antitracking) {
    return;
  }
  const HashProb = getModule('antitracking/hash').HashProb; // TODO: remove getModule
  const hp = new HashProb();
  const pipeline = getModule('webrequest-pipeline/background').default; // TODO: remove getModule
  const pacemaker = getModule('core/pacemaker').default; // TODO: remove getModule
  const browser = getModule('core/browser'); // TODO: remove getModule

  function getAttrack() {
    // return getModule('antitracking/background').default.attrack;
    return getWindow().CLIQZ.app.modules.antitracking.background.attrack;
  }

  // make sure that module is loaded
  CliqzUtils.setPref('modules.antitracking.enabled', true);

  before(function () {
    // pause pacemaker to prevent external list updates
    pacemaker.stop();
  });

  beforeEach(function () {
    pipeline.unload();
    return pipeline.init().then(() => getAttrack().initPipeline());
  });

  after(function () {
    pipeline.unload();
    // restart pacemaker
    pacemaker.start();
  });

  describe('core/browser', function () {
    describe('isWindowActive', function () {
      it('returns false for none existant tab ids', function () {
        chai.expect(browser.isWindowActive(-1)).to.be.false;
        chai.expect(browser.isWindowActive(0)).to.be.false;
        chai.expect(browser.isWindowActive(532)).to.be.false;
      });

      describe('when tab is opened', function () {
        let tabs = [];
        let tabId;

        beforeEach(function (done) {
          testServer.registerPathHandler('/', function (req, res) {
            res.write('<html><body><p>Hello world</p></body></html');
          });

          // clear active tabs
          getAttrack().tp_events._active = {};
          // get tab id from tp_events (assumption that this is correct)
          waitUntilServerUp('http://cliqztest.com:60508/', 5, function () {
            browser.newTab('http://cliqztest.com:60508/').then((_tabId) => {
              tabs.push(_tabId);
              tabId = _tabId;

              waitFor(function () {
                return Object.keys(getAttrack().tp_events._active).length > 0;
              }).then(done);
            });
          });
        });

        afterEach(function () {
          return Promise.all(tabs.map(_tabId => browser.closeTab(_tabId))).then(() => {
            tabs = [];
          });
        });

        it('returns true for open tab id', function () {
          return waitFor(function () {
            return browser.isWindowActive(tabId) === true;
          });
        });

        describe('when tab is closed', function () {
          beforeEach(function () {
            return browser.closeTab(tabs.shift());
          });

          it('returns false for closed tab id', function () {
            chai.expect(browser.isWindowActive(tabId)).to.be.false;
          });
        });
      });
    });
  });

  describe('CliqzAttack.tp_events', function () {
    const urlInfo = getModule('core/url-info').URLInfo; // TODO: remove getModule

    describe('Integration', function () {
      const win = CliqzUtils.getWindow();
      const gBrowser = win.gBrowser;
      let tabs = [];

      beforeEach(function () {
        return getAttrack().tp_events.commit(true).then(() => {
          getAttrack().tp_events._staged = [];
          // prevent data push during the test
          getAttrack()._last_push = (new Date()).getTime();
        });
      });

      afterEach(function () {
        closeAllTabs(gBrowser);
        tabs = [];
      });

      it('should initially have no active tabs', function () {
        chai.expect(getAttrack().tp_events._active).to.be.empty;
      });

      describe('when tabs are opened', function () {
        let tabId = 0;
        let pageLoad;

        beforeEach(function (done) {
          this.timeout(50000);
          testServer.registerPathHandler('/', function (req, res) {
            res.write('<html><body><p>Hello world</p></body></html');
          });
          testServer.registerPathHandler('/privacy', function (req, res) {
            res.write('<html><body><p>Hello private world</p></body></html');
          });

          waitUntilServerUp('http://localhost:60508/', 5, function () {
            return browser.newTab('http://localhost:60508/').then((_tabId) => {
              tabs.push(_tabId);
            }).then(() => browser.newTab('http://localhost:60508/privacy#saferWeb')).then((_tabId) => {
              tabs.push(_tabId);
            })
              .then(done);
          });
        });

        it('should add tabs to _active', function (done) {
          return waitForAsync(function () {
            return getAttrack().tp_events.commit(true).then(function () {
              return Object.keys(getAttrack().tp_events._active).length > 0;
            });
          }).then(function () {
            chai.expect(Object.keys(getAttrack().tp_events._active).length).to.eql(2);
            tabId = Object.keys(getAttrack().tp_events._active)[0];
            pageLoad = getAttrack().tp_events._active[tabId];
            chai.expect(pageLoad).to.include.keys('hostname', 'url', 'path');
            chai.expect(pageLoad.url).to.equal('http://localhost:60508/');
            chai.expect(pageLoad.hostname).to.equal('localhost');
            // md5('/')
            chai.expect(pageLoad.path).to.equal('6666cd76f96956469e7be39d750cc7d9'.substring(0, 16));
            chai.expect(pageLoad.tps).to.be.empty;
            done();
          });
        });

        describe('when a tab is closed', function () {
          beforeEach(function () {
            return browser.closeTab(tabs.shift());
          });

          describe('CliqzAttrack.tp_events.commit', function () {
            it('should stage closed tabs only', function () {
              return waitForAsync(function () {
                return getAttrack().tp_events.commit(true).then(function () {
                  return Object.keys(getAttrack().tp_events._active).length === 1;
                });
              }).then(function () {
                chai.expect(Object.keys(getAttrack().tp_events._active).length).to.eql(1);
                // check staged tab
                if (getAttrack().tp_events._staged.length > 1) {
                  const urls = getAttrack().tp_events._staged.map(function (s) {
                    return s.url;
                  });
                  throw urls;
                }
                chai.expect(getAttrack().tp_events._staged.length).to.eql(1);
                chai.expect(getAttrack().tp_events._staged[0].url).to.equal('http://localhost:60508/');

                // check active tab
                tabId = Object.keys(getAttrack().tp_events._active)[0];
                chai.expect(getAttrack().tp_events._active[tabId].url).to.equal('http://localhost:60508/privacy#saferWeb');
              });
            });
          });
        });

        describe('when new page is loaded in existing tab', function () {
          describe('CliqzAttrack.tp_events.commit', function () {
            beforeEach(function () {
              browser.updateTab(tabs[0], 'http://cliqztest2.de:60508/').then(() => getAttrack().tp_events.commit(true));
            });

            it('should stage previous page load', function () {
              return waitForAsync(function () {
                return getAttrack().tp_events.commit(true).then(function () {
                  return Object.keys(getAttrack().tp_events._active).length === 2
                    && getAttrack().tp_events._staged.length === 1;
                });
              }).then(function () {
                // still have 2 active tabs
                chai.expect(Object.keys(getAttrack().tp_events._active)).to.have.length(2);
                // check staged tab
                if (getAttrack().tp_events._staged.length > 1) {
                  const urls = getAttrack().tp_events._staged.map(function (s) {
                    return s.url;
                  });
                  throw urls;
                }
                chai.expect(getAttrack().tp_events._staged).to.have.length(1);
                chai.expect(getAttrack().tp_events._staged[0].url).to.equal('http://localhost:60508/');

                // check active tabs
                const tabUrls = Object.keys(getAttrack().tp_events._active).map(function (_tabId) {
                  return getAttrack().tp_events._active[_tabId].url;
                });
                chai.expect(tabUrls).to.contain('http://cliqztest2.de:60508/');
                chai.expect(tabUrls).to.contain('http://localhost:60508/privacy#saferWeb');
              });
            });
          });
        });
      });

      describe('redirects', function () {
        let serverPort;
        let hitTarget = false;

        ['302', '303', 'js'].forEach(function (kind) {
          describe(kind, function () {
            beforeEach(function (done) {
              hitTarget = false;
              serverPort = testServer.port;
              // 302 redirect case
              testServer.registerPathHandler('/302', function (request, response) {
                response.setStatusLine(request.httpVersion, 302, 'Redirect');
                response.setHeader('Location', `http://cliqztest2.de:${serverPort}/target`);
                response.write('<html><body></body></html>');
              });
              // 303 redirect case
              testServer.registerPathHandler('/303', function (request, response) {
                response.setStatusLine(request.httpVersion, 303, 'Redirect');
                response.setHeader('Location', `http://cliqztest2.de:${serverPort}/target`);
                response.write('<html><body></body></html>');
              });
              // js redirect case
              testServer.registerPathHandler('/js', function (request, response) {
                response.write(`<html><body><script>window.location="http://cliqztest2.de:${serverPort}/target"</script></body></html>`);
              });
              testServer.registerPathHandler('/target', function (request, response) {
                response.write('<html><body></body></html>');
                hitTarget = true;
              });
              waitUntilServerUp(`http://localhost:${serverPort}/js`, 5, () =>
                getAttrack().tp_events.commit(true).then(() => browser.newTab(`http://localhost:${serverPort}/${kind}`)).then((tabId) => {
                  tabs.push(tabId);
                }).then(done)
              );
            });

            it('gets host at end of redirect chain', function (done) {
              waitFor(function () {
                return hitTarget && Object.keys(getAttrack().tp_events._active).length === 1;
              }).then(function () {
                chai.expect(Object.keys(getAttrack().tp_events._active)).to.have.length(1);
                const tabid = Object.keys(getAttrack().tp_events._active)[0];
                chai.expect(getAttrack().tp_events._active[tabid].hostname).to.equal('cliqztest2.de');
                if (kind !== 'js') {
                  // check original is in redirect chain
                  chai.expect(getAttrack().tp_events._active[tabid].redirects).to.have.length(1);
                  chai.expect(getAttrack().tp_events._active[tabid].redirects[0]).to.equal('localhost');
                }
              }).then(done, done);
            });
          });
        });
      });
    });
  });
};

TESTS.AttrackIntegrationTest.MIN_BROWSER_VERSION = 39;
