/* eslint prefer-arrow-callback: 'off' */
/* eslint func-names: 'off' */
/* eslint no-unused-expressions: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: 'off' */
/* eslint no-console: 'off' */

/* global waitFor */
/* global testServer */
/* global chai */
/* global waitForAsync */

import utils from '../core/utils';
import * as browser from '../platform/browser';
import Attrack from '../antitracking/attrack';
import Config from '../antitracking/config';
import pacemaker from '../core/pacemaker';

// Mock webrequest listener
import { setGlobal } from '../core/kord/inject';
import WebRequestPipeline from '../webrequest-pipeline/background';

// make sure that module is loaded (default it is not initialised on extension startup)
utils.setPref('modules.antitracking.enabled', true);

before((done) => {
  // pause pacemaker to prevent external list updates
  pacemaker.stop();
  const config = {
    mode: 'pac_script',
    pacScript: {
      data: `
        // Default connection
        let direct = "DIRECT";

        // Alternate Proxy Server
        let proxy = "PROXY localhost:3000";

        function FindProxyForURL(url, host)
        {
          // Use Proxy?
          if (localHostOrDomainIs(host, "cliqztest.com") || localHostOrDomainIs(host, "www.cliqztest.com")
            || localHostOrDomainIs(host, "cliqztest.de")) {
              return proxy;
          } else {
            return direct;
          }
        }
      `
    }
  };

  chrome.proxy.settings.set(
    { value: config, scope: 'regular' },
    done
  );
});

let attrack;

beforeEach(function () {
  // Try to mock app
  WebRequestPipeline.unload();
  return WebRequestPipeline.init({})
    .then(() => setGlobal({
      modules: {
        'webrequest-pipeline': {
          isEnabled: true,
          isReady() { return Promise.resolve(true); },
          background: {
            actions: {
              addPipelineStep(...args) {
                return WebRequestPipeline.actions.addPipelineStep(...args);
              },
              removePipelineStep(...args) {
                return WebRequestPipeline.actions.removePipelineStep(...args);
              },
            }
          }
        }
      }
    }))
    .then(() => {
      attrack = new Attrack();
    })
    .then(() => attrack.init(new Config({})));
});

after(() => {
  // restart pacemaker
  pacemaker.start();
});

afterEach(() =>
  attrack.tp_events.commit(true, true)
    .then(() => attrack.tp_events.push(true))
    .then(() => attrack.unload())
    .then(() => WebRequestPipeline.unload()));


describe('platform/browser', function () {
  describe('#checkIsWindowActive', function () {
    it('returns false for none existant tab ids', () =>
      browser.checkIsWindowActive(-1).then(res => chai.expect(res).to.be.false)
        .then(() => browser.checkIsWindowActive(0).then(res => chai.expect(res).to.be.false))
        .then(() => browser.checkIsWindowActive(532).then(res => chai.expect(res).to.be.false)));

    describe('when tab is opened', function () {
      let tabId;

      beforeEach(function () {
        attrack.tp_events._active = {};
        return testServer.registerPathHandler('/', '<html><body><p>Hello world</p></body></html')
          .then(() => browser.newTab(testServer.getBaseUrl(), true))
          .then((id) => { tabId = id; });
      });

      it('returns true for open tab id', function () {
        return browser.checkIsWindowActive(tabId)
          .then(res => chai.expect(res).to.be.true);
      });

      describe('when tab is closed', function () {
        it('returns false for closed tab id', function () {
          return browser.closeTab(tabId)
            .then(() => browser.checkIsWindowActive(tabId))
            .then(res => chai.expect(res).to.be.false);
        });
      });
    });
  });
});


describe('attrack.tp_events', function () {
  describe('Integration', function () {
    let tabs = [];

    beforeEach(function () {
      return attrack.tp_events.commit(true).then(() => {
        attrack.tp_events._staged = [];
        // prevent data push during the test
        attrack._last_push = (new Date()).getTime();
      });
    });

    afterEach(function () {
      return Promise.all(tabs.map(tabId => browser.closeTab(tabId)))
        .then(() => { tabs = []; });
    });

    it('should initially have no active tabs', function () {
      chai.expect(attrack.tp_events._active).to.be.empty;
    });

    describe('when tabs are opened', function () {
      let tabId = 0;
      tabs = [];
      let pageLoad;

      beforeEach(function () {
        return Promise.all([
          testServer.registerPathHandler('/', '<html><body><p>Hello world</p></body></html'),
          testServer.registerPathHandler('/privacy', '<html><body><p>Hello private world</p></body></html'),
        ])
          .then(() => browser.newTab(testServer.getBaseUrl(), false).then(id => tabs.push(id)))
          .then(() => browser.newTab(testServer.getBaseUrl('privacy#saferWeb'), false).then(id => tabs.push(id)));
      });

      it('should add tabs to _active', function () {
        return waitFor(function () {
          return Object.keys(attrack.tp_events._active).length === 2;
        })
          .then(function () {
            chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(2);
            tabId = Object.keys(attrack.tp_events._active)[0];
            pageLoad = attrack.tp_events._active[tabId];
            chai.expect(pageLoad).to.include.keys('hostname', 'url', 'path');
            chai.expect(pageLoad.url).to.equal(testServer.getBaseUrl());
            chai.expect(pageLoad.hostname).to.equal('localhost');
            // md5('/')
            chai.expect(pageLoad.path).to.equal('6666cd76f96956469e7be39d750cc7d9'.substring(0, 16));
            chai.expect(pageLoad.tps).to.be.empty;
          });
      });

      describe('when a tab is closed', function () {
        beforeEach(function () {
          return waitFor(() => Object.keys(attrack.tp_events._active).length === 2)
            .then(() => browser.closeTab(tabs.shift()))
            .then(() => attrack.tp_events.commit(true));
        });

        xdescribe('attrack.tp_events.commit', function () {
          it('should stage closed tabs only', function () {
            chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(1);
            // check staged tab
            if (attrack.tp_events._staged.length > 1) {
              throw attrack.tp_events._staged.map(s => s.url);
            }
            chai.expect(attrack.tp_events._staged).to.have.length(1);
            chai.expect(attrack.tp_events._staged[0].url).to.equal(testServer.getBaseUrl());

            // check active tab
            tabId = Object.keys(attrack.tp_events._active)[0];
            chai.expect(attrack.tp_events._active[tabId].url).to.equal(testServer.getBaseUrl('privacy#saferWeb'));
          });
        });
      });

      xdescribe('when new page is loaded in existing tab', function () {
        const newUrl = `http://cliqztest.de:${testServer.port}/`;
        beforeEach(function () {
          return browser.updateTab(tabs[0], newUrl);
        });

        describe('attrack.tp_events.commit', function () {
          it('should stage previous page load', function () {
            return waitForAsync(() =>
              attrack.tp_events.commit(true)
                .then(() => attrack.tp_events._staged.length > 0)
            )
              .then(function () {
                // still have 2 active tabs
                chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(2);
                // check staged tab
                if (attrack.tp_events._staged.length > 1) {
                  const urls = attrack.tp_events._staged.map(function (s) { return s.url; });
                  throw urls;
                }
                chai.expect(attrack.tp_events._staged).to.have.length(1);
                chai.expect(attrack.tp_events._staged[0].url).to.equal(testServer.getBaseUrl());

                // check active tabs
                const tabUrls = Object.keys(attrack.tp_events._active).map(function (_tabId) {
                  return attrack.tp_events._active[_tabId].url;
                });
                chai.expect(tabUrls).to.not.contain(testServer.getBaseUrl());
                chai.expect(tabUrls).to.contain(testServer.getBaseUrl('privacy#saferWeb'));
              });
          });
        });
      });
    });

    describe('redirects', function () {
      // hit_target TODO

      beforeEach(function () {
        const body = '<html><body></body></html>';
        const jsBody = '<html><body><script>window.location="http://cliqztest.com/target"</script></body></html>';
        // 302 redirect case
        return Promise.all([
          testServer.registerPathHandler('/302', body, [{ name: 'Location', value: 'http://cliqztest.com/target' }], '302'),
          testServer.registerPathHandler('/303', body, [{ name: 'Location', value: 'http://cliqztest.com/target' }], '303'),
          testServer.registerPathHandler('/js', jsBody),
          testServer.registerPathHandler('/target', body),
        ]);
      });

      ['302', '303', 'js'].forEach(function (kind) {
        describe(kind, function () {
          beforeEach(function () {
            return browser.newTab(testServer.getBaseUrl(kind))
              .then(id => tabs.push(id));
          });

          it('gets host at end of redirect chain', function () {
            return waitForAsync(() => testServer.hasHit('/target'))
              .then(() => attrack.tp_events.commit(true))
              .then(() => testServer.getHits())
              .then((hits) => {
                chai.expect(hits[`/${kind}`]).to.have.length(1);
                chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(1);
                const tabid = Object.keys(attrack.tp_events._active)[0];
                chai.expect(attrack.tp_events._active[tabid].hostname).to.equal('cliqztest.com');
                if (kind !== 'js') {
                  // check original is in redirect chain
                  chai.expect(attrack.tp_events._active[tabid].redirects).to.have.length(1);
                  chai.expect(attrack.tp_events._active[tabid].redirects[0]).to.equal('localhost');
                }
              });
          });
        });
      });
    });
  });
});
